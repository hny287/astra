# Why DB-Backed Config?

**Last updated:** 2026-05-15 | **Version:** v2.23.0

Rationale for storing configuration in the database instead of files.

---

## Original Design: File-Based Config

Initial implementation used `scan.config.json`:

```json
{
  "providers": {
    "anthropic": {
      "baseURL": "https://api.anthropic.com",
      "apiKeyEnv": "ANTHROPIC_API_KEY"
    }
  },
  "scan": {
    "nodes": {
      "deepScan": {
        "provider": "anthropic",
        "model": "claude-sonnet-4-6"
      }
    }
  }
}
```

**Problems:**
1. **Restart Required:** Config changes needed application restart
2. **No Audit Trail:** Changes not logged or tracked
3. **Environment Sync:** Different configs per environment (dev, staging, prod)
4. **UI Integration:** No way to modify config from UI

---

## DB-Backed Design

Configuration stored in `Config` table:

```prisma
model Config {
  id    String @id @default(cuid())
  key   String @unique
  value Json
}
```

**Entry:**
```json
{
  "key": "astra.scan.config",
  "value": {
    "providers": {...},
    "scan": {...}
  }
}
```

---

## Implementation

### Load Config

```typescript
// src/lib/config.ts
export async function loadConfigFromDb(): Promise<ScanConfig> {
  const row = await prisma.config.findUnique({
    where: { key: SCAN_CONFIG_DB_KEY }
  });

  if (!row) {
    // Fall back to file on first boot
    const fileConfig = loadConfigFromFile();
    await saveConfigToDb(fileConfig);
    return fileConfig;
  }

  return configSchema.parse(row.value);
}
```

### Save Config

```typescript
export async function saveConfigToDb(config: ScanConfig): Promise<void> {
  await prisma.config.upsert({
    where: { key: SCAN_CONFIG_DB_KEY },
    update: { value: config as any },
    create: { key: SCAN_CONFIG_DB_KEY, value: config as any }
  });
}
```

### Runtime Updates

```typescript
// PUT /api/v1/config
export async function PUT(request: Request) {
  const user = await requireAuth(request);

  if (!canAdmin(user)) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const newConfig = await request.json();

  // Validate schema
  configSchema.parse(newConfig);

  // Save to DB
  await saveConfigToDb(newConfig);

  // No restart needed - next scan uses new config
  return json({ success: true });
}
```

---

## Benefits

### 1. Runtime Changes

Config changes take effect immediately:

```
Admin updates AI provider in UI
        ↓
Config saved to DB
        ↓
Next scan uses new provider
        ↓
No restart required
```

### 2. Audit Trail

All changes logged:

```typescript
// Config change logged
{
  "action": "config_update",
  "userId": "admin-123",
  "previousValue": {...},
  "newValue": {...},
  "timestamp": "2026-05-15T14:00:00Z"
}
```

### 3. Environment Consistency

Same config across environments:
- Dev: Local PostgreSQL
- Staging: Staging database
- Prod: Production database

No file sync needed.

### 4. UI Integration

Admins configure via UI:

```
Settings → Scan Configuration → Edit → Save
```

No SSH or file editing required.

---

## Boot Sequence

```
┌──────────────────────────────────────────────────────────────────┐
│                      APPLICATION BOOT                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Application starts                                           │
│         │                                                        │
│         ▼                                                        │
│  2. Load config from DB                                          │
│         │                                                        │
│         ├────────────────────────────────┐                       │
│         │ Config exists?                 │                       │
│         │                                │                       │
│         │ YES ──────┐                    │ NO                   │
│         │           │                    │                      │
│         │           ▼                    │                      │
│         │    Use DB config              │                      │
│         │           │                    │                      │
│         │           │                    ▼                      │
│         │           │            Load file config               │
│         │           │                    │                      │
│         │           │                    ▼                      │
│         │           │            Save to DB                     │
│         │           │                    │                      │
│         └───────────┼────────────────────┘                      │
│                     │                                            │
│                     ▼                                            │
│  3. Config available for all operations                         │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Config Keys

| Key | Purpose |
|-----|---------|
| `astra.scan.config` | Main scan configuration |
| `prompts.deep_scan` | Deep scan system prompt |
| `prompts.cross_file` | Cross-file system prompt |
| `prompts.chat` | Chat system prompt |

---

## Migration from File

### Step 1: Export File Config

```bash
cat scan.config.json
```

### Step 2: Import to DB

```typescript
// Migration script
const fileConfig = JSON.parse(fs.readFileSync('scan.config.json'));
await prisma.config.create({
  data: {
    key: 'astra.scan.config',
    value: fileConfig
  }
});
```

### Step 3: Verify

```typescript
const config = await loadConfigFromDb();
console.log('Config loaded from DB:', config);
```

---

## Hybrid Approach

Astra uses a hybrid approach:

1. **First boot:** Load from file, save to DB
2. **Subsequent boots:** Load from DB
3. **File preserved:** Can revert by deleting DB row

This provides:
- File-based initial configuration
- DB-based runtime updates
- Easy rollback

---

## Security Considerations

### Access Control

Only ADMIN can modify config:

```typescript
if (!canAdmin(user)) {
  return json({ error: 'Forbidden' }, { status: 403 });
}
```

### Validation

All config changes validated against Zod schema:

```typescript
configSchema.parse(newConfig); // Throws on invalid
```

### API Keys

API keys stored in environment variables, not config:

```json
{
  "anthropic": {
    "apiKeyEnv": "ANTHROPIC_API_KEY"  // Reference, not value
  }
}
```

---

## Troubleshooting

### Config Not Applying

**Cause:** DB config out of sync

**Solution:**
1. Check DB: `SELECT * FROM "Config" WHERE key = 'astra.scan.config'`
2. Update via UI or API
3. Restart if needed (rare)

### Corrupted Config

**Cause:** Invalid JSON or schema violation

**Solution:**
1. Delete DB row
2. Restart application
3. Config reloaded from file

### Rollback to File

```sql
DELETE FROM "Config" WHERE key = 'astra.scan.config';
```

Restart application - config loads from file.

---

## See Also

- [Config API](../../reference/api/config.md)
- [Config Schema](../../reference/config/schema.md)
- [Edit Configuration How-to](../../how-to/edit-security-rules.md)
