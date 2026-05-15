# Token Encryption

**Last updated:** 2026-05-15 | **Version:** v2.23.0

How Astra encrypts GitHub Personal Access Tokens (PATs) at rest.

---

## Overview

GitHub PATs are sensitive credentials that enable Astra to:
- Clone private repositories
- Browse GitHub repos in UI
- Inject authentication for git operations

Astra encrypts these tokens at rest using AES-256-GCM.

---

## Encryption Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                    TOKEN ENCRYPTION FLOW                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User enters PAT in UI                                          │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────────┐                                            │
│  │  API Route      │                                            │
│  │  POST /github/link                                           │
│  └────────┬────────┘                                            │
│           │                                                      │
│           ▼                                                      │
│  ┌─────────────────┐                                            │
│  │  encryptToken() │                                            │
│  │  - Generate IV  │                                            │
│  │  - AES-256-GCM  │                                            │
│  │  - Auth tag     │                                            │
│  └────────┬────────┘                                            │
│           │                                                      │
│           ▼                                                      │
│  ┌─────────────────┐                                            │
│  │  Store in DB    │                                            │
│  │  GithubProfile  │                                            │
│  │  accessToken    │                                            │
│  └─────────────────┘                                            │
│                                                                  │
│  Later: Token needed for clone                                  │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────────┐                                            │
│  │  decryptToken() │                                            │
│  │  - Verify tag   │                                            │
│  │  - AES-256-GCM  │                                            │
│  │  - Return plain │                                            │
│  └────────┬────────┘                                            │
│           │                                                      │
│           ▼                                                      │
│  ┌─────────────────┐                                            │
│  │  Git clone      │                                            │
│  │  PAT injected   │                                            │
│  │  in URL         │                                            │
│  └─────────────────┘                                            │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Implementation

### Encryption Function

```typescript
// src/lib/encryption.ts
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex'); // 32 bytes

export function encryptToken(plaintext: string): string {
  const iv = randomBytes(12); // 96-bit IV
  const cipher = createCipheriv(ALGORITHM, KEY, iv);

  let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
  ciphertext += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  // Format: iv:authTag:ciphertext
  return `${iv.toString('hex')}:${authTag}:${ciphertext}`;
}

export function decryptToken(encrypted: string): string {
  const [ivHex, authTagHex, ciphertext] = encrypted.split(':');

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);

  let plaintext = decipher.update(ciphertext, 'hex', 'utf8');
  plaintext += decipher.final('utf8');

  return plaintext;
}
```

---

## Database Schema

```prisma
model GithubProfile {
  id          String   @id @default(cuid())
  userId      String   @unique
  githubId    Int      @unique
  username    String
  accessToken String   // ENCRYPTED
  avatarUrl   String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

---

## Key Management

### Environment Variable

```bash
# .env.local
ENCRYPTION_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
```

### Key Generation

```bash
# Generate 256-bit key
openssl rand -hex 32
```

### Key Storage

- **Development:** `.env.local` file
- **Production:** Secret management (Vault, AWS Secrets Manager, etc.)
- **Never** commit keys to version control

---

## Security Properties

### AES-256-GCM

| Property | Value |
|----------|-------|
| **Algorithm** | AES-256-GCM |
| **Key Size** | 256 bits |
| **IV Size** | 96 bits (random per encryption) |
| **Auth Tag** | 128 bits (integrity verification) |
| **Mode** | Galois/Counter Mode (authenticated) |

### Security Guarantees

1. **Confidentiality:** Token cannot be read without key
2. **Integrity:** Tampering detected via auth tag
3. **Uniqueness:** Random IV ensures different ciphertexts

---

## Token Usage

### Clone Node

```typescript
// src/scan/nodes/clone.ts
async function cloneRepo(repoUrl: string, pat?: string): Promise<string> {
  let cloneUrl = repoUrl;

  if (pat) {
    const decrypted = decryptToken(pat);
    // https://ghp_xxxx@github.com/owner/repo.git
    cloneUrl = repoUrl.replace('https://', `https://${decrypted}@`);
  }

  await exec(`git clone ${cloneUrl} ${tempDir}`);
  return tempDir;
}
```

### API Routes

```typescript
// POST /api/v1/github/link
export async function POST(request: Request) {
  const user = await requireAuth(request);
  const { token } = await request.json();

  // Encrypt before storing
  const encryptedToken = encryptToken(token);

  await prisma.githubProfile.upsert({
    where: { userId: user.id },
    update: { accessToken: encryptedToken },
    create: {
      userId: user.id,
      accessToken: encryptedToken,
      // ... fetch profile from GitHub
    }
  });

  return json({ success: true });
}
```

---

## Token Lifecycle

### Creation

1. User enters PAT in UI
2. API encrypts token
3. Encrypted token stored in DB

### Usage

1. Clone node queries GithubProfile
2. Token decrypted in memory
3. Used for git authentication
4. Never logged or persisted

### Deletion

1. User unlinks GitHub account
2. Row deleted from GithubProfile
3. Encrypted token permanently removed

---

## Security Best Practices

### Key Rotation

To rotate the encryption key:

1. Generate new key
2. Decrypt all tokens with old key
3. Re-encrypt with new key
4. Update `ENCRYPTION_KEY` environment variable

### Access Control

- Only clone node accesses tokens
- Tokens never exposed in API responses
- Audit logging for token usage

### Token Expiration

- GitHub PATs should have 90-day expiration
- Astra does not enforce, but recommends
- Expired tokens fail at clone time

---

## Troubleshooting

### Decryption Fails

**Possible causes:**
1. `ENCRYPTION_KEY` changed
2. Database corrupted
3. Token format invalid

**Solutions:**
1. Verify key matches original
2. User must re-link GitHub account
3. Check token format (iv:tag:ciphertext)

### Token Not Working

**Possible causes:**
1. Token expired
2. Token revoked
3. Insufficient scopes

**Solutions:**
1. Regenerate PAT in GitHub
2. Update in Astra Settings
3. Verify `repo` scope included

---

## See Also

- [Link GitHub Account How-to](../../how-to/link-github-account.md)
- [GithubProfile Schema](../../reference/schema/user.md)
- [Clone Node](../../tutorials/02-scan-pipeline.md#stage-1-clone)
