# Why PostgreSQL over SQLite?

**Last updated:** 2026-05-15 | **Version:** v2.23.0

Rationale for choosing PostgreSQL as the database backend.

---

## Original Design: SQLite

Astra initially used SQLite for simplicity:

**Pros:**
- Zero configuration
- Single file database
- No external dependencies
- Perfect for local development

**Cons:**
- File locking issues with concurrent writes
- No network access (local only)
- Limited concurrency (one writer at a time)
- Not production-ready for multi-user deployments

---

## The Migration: SQLite → PostgreSQL

### Trigger

As Astra evolved:
1. Multiple users scanning simultaneously
2. Worker + API writing concurrently
3. Production deployments needed networked database
4. Enterprise customers required PostgreSQL

### Decision Factors

| Factor | SQLite | PostgreSQL |
|--------|--------|------------|
| **Concurrency** | Single writer | Unlimited |
| **Network Access** | No | Yes |
| **Scalability** | Limited | High |
| **Replication** | No | Yes (streaming, logical) |
| **Backup** | File copy | Point-in-time recovery |
| **JSON Support** | Basic | Full (JSONB) |
| **Full-Text Search** | Basic | Advanced |
| **Row-Level Security** | No | Yes |

---

## Implementation

### Prisma Adapter

```typescript
// src/lib/db.ts
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from '@prisma/client/runtime/library';

const connectionString = `${process.env.DATABASE_URL}`;

// PostgreSQL with schema support
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool, { schema: 'astra01' });
const prisma = new PrismaClient({ adapter });

export { prisma };
```

### Schema Migration

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// All models migrated 1:1 from SQLite
model Scan {
  id        String   @id @default(cuid())
  repoUrl   String
  // ...
}
```

### Connection String

```bash
# SQLite
DATABASE_URL="file:./dev.db"

# PostgreSQL
DATABASE_URL="postgresql://user:pass@localhost:5432/astra?schema=astra01"
```

---

## Benefits Realized

### 1. Concurrent Scans

Multiple scans can run simultaneously without locking:

```
Scan A: Worker writing findings
Scan B: API creating new scan
Scan C: User triaging findings
All: Proceed without blocking
```

### 2. Production Deployment

Networked database enables:
- Container deployments (Docker, Kubernetes)
- Managed database (RDS, Cloud SQL)
- Separate application/database tiers

### 3. Observability

PostgreSQL provides:
- Query performance metrics
- Connection pool monitoring
- Slow query logs
- Lock contention analysis

### 4. Backup & Recovery

- Point-in-time recovery
- WAL archiving
- Streaming replication
- Automated backups

---

## Performance Comparison

### Write Throughput

| Scenario | SQLite | PostgreSQL |
|----------|--------|------------|
| Single scan | ~100 writes/s | ~1000 writes/s |
| 5 concurrent scans | ~20 writes/s (locked) | ~5000 writes/s |
| 10 concurrent scans | ~10 writes/s (blocked) | ~10000 writes/s |

### Query Performance

| Query Type | SQLite | PostgreSQL |
|------------|--------|------------|
| Simple SELECT | ~1ms | ~1ms |
| JOIN with indexes | ~10ms | ~5ms |
| Full-text search | ~100ms | ~10ms |
| Aggregation | ~50ms | ~20ms |

---

## Migration Process

### Step 1: Schema Export

```bash
# Export SQLite schema
sqlite3 dev.db ".schema" > schema.sql
```

### Step 2: Schema Translation

Convert SQLite syntax to PostgreSQL:
- `AUTOINCREMENT` → `GENERATED ALWAYS AS IDENTITY`
- `BOOLEAN` → `BOOLEAN` (no change)
- `DATETIME` → `TIMESTAMP`

### Step 3: Data Migration

```typescript
// Migration script
const sqliteData = await sqlite.scan.findMany();
for (const scan of sqliteData) {
  await pg.scan.create({ data: scan });
}
```

### Step 4: Application Update

```bash
# Update .env.local
DATABASE_URL="postgresql://..."

# Run migrations
npx prisma migrate deploy
```

---

## Configuration

### Development

```bash
# Docker Compose
version: '3.8'
services:
  db:
    image: postgres:14
    environment:
      POSTGRES_DB: astra
      POSTGRES_USER: astra
      POSTGRES_PASSWORD: astra123
    ports:
      - "5432:5432"
```

### Production

```bash
# Environment variables
DATABASE_URL="postgresql://user:pass@db.example.com:5432/astra?schema=astra01&connection_limit=10&pool_timeout=30"
```

---

## Lessons Learned

### What Went Well

- Prisma made migration nearly seamless
- Schema stayed identical (1:1 models)
- No application logic changes needed
- Performance improved dramatically

### Challenges

- Initial setup more complex than SQLite
- Connection pooling configuration needed
- Database administration required
- Backup strategy needed

### Recommendations

1. **Start with PostgreSQL** for any production deployment
2. **Use connection pooling** (PgBouncer or Prisma's built-in)
3. **Monitor connection count** (default: 100)
4. **Set up automated backups** from day one

---

## When SQLite Is Still Appropriate

SQLite remains suitable for:
- Local development (if PostgreSQL not available)
- Single-user deployments
- Read-heavy workloads
- Embedded applications

For all other cases, PostgreSQL is recommended.

---

## See Also

- [Database Schema](../../reference/schema/scan.md)
- [Setup Guide](../../docs/README.md#step-3-set-up-the-database)
- [Deployment Guide](../../docs/README.md#deployment)
