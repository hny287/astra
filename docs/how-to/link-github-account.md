# Link GitHub Account

**Last updated:** 2026-05-15 | **Version:** v2.23.0

This guide shows you how to connect your GitHub account to Astra for scanning private repositories.

---

## Why Link GitHub?

Linking your GitHub account enables:

- Scanning private repositories
- Browsing GitHub repos directly in Astra UI
- Automatic PAT injection for git clone
- Encrypted token storage (AES-256-GCM)

---

## Step 1: Generate GitHub PAT

1. Visit [GitHub Settings → Developer Settings → Personal Access Tokens](https://github.com/settings/tokens)
2. Click **Generate new token (classic)**
3. Configure token:
   - **Note:** `Astra Security Platform`
   - **Expiration:** 90 days (recommended)
   - **Scopes:**
     - ☑️ `repo` (Full control of private repositories)
4. Click **Generate token**
5. **Copy the token immediately** (format: `ghp_...`)

---

## Step 2: Navigate to GitHub Integration

1. Click your avatar in the top-right
2. Click **Settings**
3. Navigate to **GitHub Integration** tab

---

## Step 3: Enter PAT

1. Paste your GitHub PAT into the token field
2. Click **Save**

The token is:
- Encrypted at rest with AES-256-GCM
- Stored in the `GithubProfile` table
- Associated with your user account

---

## Step 4: Verify Connection

After saving:

1. Click **Test Connection**
2. Astra fetches your GitHub profile
3. Your GitHub username appears

---

## Step 5: Browse Private Repos

Once linked:

1. Click **New Scan**
2. Select **GitHub Repository**
3. Click **Browse Repos**
4. See both public and private repositories
5. Select a repo and start scanning

---

## Unlink GitHub Account

To remove the link:

1. Navigate to **Settings** → **GitHub Integration**
2. Click **Unlink GitHub**
3. Confirm

Your encrypted token is deleted immediately.

---

## Token Security

### Encryption

GitHub PATs are encrypted at rest:

- **Algorithm:** AES-256-GCM
- **Key:** Derived from `ENCRYPTION_KEY` environment variable
- **Storage:** Only encrypted token in database

### Access

Encrypted tokens are only decrypted when:

- Cloning a private repository
- Browsing GitHub repos in UI
- Testing the connection

### Best Practices

- Use 90-day expiration
- Rotate tokens regularly
- Revoke tokens if compromised
- Use separate PAT for Astra

---

## Troubleshooting

### Error: "Invalid token"

**Cause:** PAT is malformed or revoked

**Solution:**
1. Verify token starts with `ghp_`
2. Check token is not expired
3. Regenerate token if needed

### Error: "Bad credentials"

**Cause:** Token doesn't have required scopes

**Solution:**
1. Regenerate token with `repo` scope
2. Ensure `repo` includes all sub-scopes
3. Save and retry

### Cannot See Private Repos

**Cause:** PAT missing `repo` scope

**Solution:**
1. Regenerate token with `repo` scope
2. Unlink and re-link GitHub account
3. Verify in GitHub settings

### Token Expired

**Cause:** PAT reached expiration date

**Solution:**
1. Generate new PAT in GitHub
2. Update in Astra Settings
3. Delete old token in GitHub

---

## See Also

- [Scan GitHub Repository](./scan-github-repo.md)
- [Token Encryption](../explanation/security/encryption.md)
- [User Preferences](./user-preferences.md)
