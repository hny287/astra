import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const ENCRYPTED_PREFIX = 'enc:';

function getKey(): Buffer | null {
  const raw = process.env.ENCRYPTION_KEY ?? '';
  if (!raw) return null;
  const key = Buffer.from(raw, 'hex');
  return key.length === 32 ? key : null;
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  if (!key) {
    // No encryption key configured — store as plaintext with a prefix so we can detect it later
    // This allows the app to function without ENCRYPTION_KEY (tokens stored unencrypted)
    return `${ENCRYPTED_PREFIX}${plaintext}`;
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${ENCRYPTED_PREFIX}${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(stored: string): string {
  // Legacy plaintext tokens (no prefix) — return as-is
  if (!stored.startsWith(ENCRYPTED_PREFIX)) {
    return stored;
  }
  const ciphertext = stored.slice(ENCRYPTED_PREFIX.length);

  // If no encryption key, the value after prefix is the plaintext itself
  const key = getKey();
  if (!key) {
    return ciphertext;
  }

  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    // Malformed encrypted value — return as-is (best effort)
    return ciphertext;
  }
  const [ivHex, tagHex, dataHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const data = Buffer.from(dataHex, 'hex');
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(data) + decipher.final('utf8');
}