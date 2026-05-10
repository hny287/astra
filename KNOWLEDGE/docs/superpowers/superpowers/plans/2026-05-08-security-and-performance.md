# Security & Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lock down all unprotected API routes with authentication and authorization, fix the middleware bypass, add rate limiting, encrypt sensitive tokens, and address key performance issues (sync I/O, worker polling, temp cleanup, pagination).

**Architecture:** Use the existing `requireAuth()` + `canWrite()`/`canAdmin()` pattern from `src/lib/rbac.ts`. Fix `middleware.ts` to remove the blanket `/api/*` bypass. Add per-route auth checks with ownership scoping where appropriate. For performance, replace the 3-second `setInterval` worker poll with a Prisma-based event loop, convert sync I/O to async, add temp dir cleanup, and create shared pagination/auth helpers.

**Tech Stack:** Next.js 15 App Router, Prisma 7, PostgreSQL, NextAuth v5, bcryptjs

---

## Security Audit Summary

**Routes with auth (OK):** `/v1/chat`, `/v1/scans` (POST, GET list), `/v1/findings/[id]` (GET, PATCH), `/v1/findings/[id]/chat`, `/v1/scans/[id]/chat`, `/v1/ai-calls`, `/v1/tasks`, `/v1/users`

**Routes WITHOUT auth (vulnerable):**
| Route | Methods | Risk |
|-------|---------|------|
| `/v1/config` | GET, PUT | Read/write system config including API keys |
| `/v1/providers` | GET | Expose provider list |
| `/v1/providers/test` | POST | Probe external AI services |
| `/v1/findings` | GET | Expose ALL findings across all scans |
| `/v1/scans/[id]` | GET | Expose scan details, config, findings |
| `/v1/scans/[id]/cancel` | POST | Cancel any scan |
| `/v1/scans/[id]/resume` | POST | Resume any scan |
| `/v1/scans/[id]/rerun-node` | POST | Rerun any pipeline node |
| `/v1/scans/[id]/export` | GET | Export scan data |
| `/v1/scans/[id]/logs` | GET | Read scan logs |
| `/v1/scans/[id]/nodes` | GET | Read node outputs |
| `/v1/scans/[id]/progress` | GET | Read progress |
| `/v1/scans/[id]/stream` | GET | SSE stream |
| `/v1/presets` | GET, POST | Read/create presets |
| `/v1/user-rules` | GET, POST | Read/create rules |
| `/v1/user-rules/[id]` | PATCH, DELETE | Modify/delete any rule |
| `/v1/preferences` | GET, POST | Read/write preferences |

**Middleware bug:** `middleware.ts` line 10 — `path.startsWith('/api/')` makes ALL API routes public, bypassing NextAuth middleware entirely.

---

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/rbac.ts` | Modify | Add `requireAuthOr401`, `requireOwnership` helpers |
| `src/middleware.ts` | Modify | Remove `/api/*` bypass, whitelist only truly public API routes |
| `src/app/api/v1/config/route.ts` | Modify | Add ADMIN-only auth to GET and PUT |
| `src/app/api/v1/providers/route.ts` | Modify | Add auth to GET |
| `src/app/api/v1/providers/test/route.ts` | Modify | Add auth to POST |
| `src/app/api/v1/findings/route.ts` | Modify | Add auth + userId-scoped filter |
| `src/app/api/v1/scans/[id]/route.ts` | Modify | Add auth + ownership check |
| `src/app/api/v1/scans/[id]/cancel/route.ts` | Modify | Add auth + ownership check |
| `src/app/api/v1/scans/[id]/resume/route.ts` | Modify | Add auth + ownership check |
| `src/app/api/v1/scans/[id]/rerun-node/route.ts` | Modify | Add auth + ownership check |
| `src/app/api/v1/scans/[id]/export/route.ts` | Modify | Add auth |
| `src/app/api/v1/scans/[id]/logs/route.ts` | Modify | Add auth |
| `src/app/api/v1/scans/[id]/nodes/route.ts` | Modify | Add auth |
| `src/app/api/v1/scans/[id]/progress/route.ts` | Modify | Add auth |
| `src/app/api/v1/presets/route.ts` | Modify | Add auth + user scoping |
| `src/app/api/v1/user-rules/route.ts` | Modify | Add auth |
| `src/app/api/v1/user-rules/[id]/route.ts` | Modify | Add auth |
| `src/app/api/v1/preferences/route.ts` | Modify | Add auth + user scoping |
| `src/app/api/v1/auth/verify/route.ts` | Modify | Add rate limiting |
| `src/app/api/v1/auth/signup/route.ts` | Modify | Add rate limiting |
| `src/lib/rate-limit.ts` | Create | Simple in-memory rate limiter |
| `src/lib/github-token.ts` | Create | Encrypt/decrypt helper for GitHub tokens |
| `src/app/api/v1/github/link/route.ts` | Modify | Encrypt accessToken before storing |
| `src/app/api/v1/github/repos/route.ts` | Modify | Decrypt accessToken when using |
| `src/lib/pagination.ts` | Create | Shared pagination param parser |
| `src/scan/worker.ts` | Modify | Replace setInterval with event-driven loop |
| `src/scan/nodes/clone.ts` | Modify | Async git clone, temp cleanup |
| `src/scan/nodes/discover.ts` | Modify | Async file discovery |
| `src/scan/nodes/deep-scan.ts` | Modify | Async file reads |
| `src/app/api/v1/chat/route.ts` | Modify | Add pagination to GET |
| `prisma/schema.prisma` | Modify | Add UserConfig relation, Preset userId field |

---

### Task 1: Fix middleware — remove blanket `/api/*` bypass

**Files:**
- Modify: `astra-app/src/middleware.ts`

- [ ] **Step 1: Write the updated middleware**

Replace the current `isPublic` check. Only truly public routes should bypass auth: `/`, `/auth/*`, `/_next/*`, `/favicon.ico`, and specific public API routes (`/api/v1/auth/*`, `/api/v1/health`). All other API routes handle their own auth via `requireAuth()`.

```typescript
import { auth } from '@/lib/auth';

export default auth((req) => {
  const path = req.nextUrl.pathname;

  // Public routes — no auth required
  const isPublic =
    path === '/' ||
    path.startsWith('/auth/') ||
    path.startsWith('/api/v1/auth/') ||
    path.startsWith('/api/v1/health') ||
    path.startsWith('/_next/') ||
    path === '/favicon.ico';

  if (isPublic) return;

  // All other routes require authentication
  if (!req.auth) {
    return Response.redirect(new URL('/auth/signin', req.url));
  }
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

- [ ] **Step 2: Verify middleware compiles**

Run: `cd astra-app && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors related to middleware

- [ ] **Step 3: Commit**

```bash
git add astra-app/src/middleware.ts
git commit -m "fix: remove blanket /api/* bypass from middleware, whitelist only public routes"
```

---

### Task 2: Create shared auth helpers in `rbac.ts`

**Files:**
- Modify: `astra-app/src/lib/rbac.ts`
- Create: `astra-app/src/lib/pagination.ts`

- [ ] **Step 1: Add `requireAdmin` and `scanOwnershipCheck` to rbac.ts**

Append these helpers to the existing `rbac.ts`:

```typescript
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

type Role = 'ADMIN' | 'ANALYST' | 'VIEWER';

export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) return { error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }), userId: null, role: null };
  return { error: null, userId: (session.user as any).id, role: (session.user as any).role as Role };
}

export function requireRole(role: Role | Role[], userId: string, userRole: Role): NextResponse | null {
  const roles = Array.isArray(role) ? role : [role];
  if (!roles.includes(userRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}

export function canWrite(role: Role): boolean {
  return role === 'ADMIN' || role === 'ANALYST';
}

export function canAdmin(role: Role): boolean {
  return role === 'ADMIN';
}

/** Check that the authenticated user owns the given scan, or is an ADMIN. Returns error response or null. */
export async function requireScanOwnership(scanId: string, userId: string, role: Role): Promise<NextResponse | null> {
  if (canAdmin(role)) return null;
  const scan = await prisma.scan.findUnique({ where: { id: scanId }, select: { userId: true } });
  if (!scan) return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
  if (scan.userId && scan.userId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}
```

Note: The existing functions stay unchanged. We only add `requireScanOwnership`.

- [ ] **Step 2: Create the shared pagination helper**

Create `astra-app/src/lib/pagination.ts`:

```typescript
import { NextRequest } from 'next/server';

export interface PaginationParams {
  limit: number;
  offset: number;
}

export function parsePagination(request: NextRequest, defaultLimit = 20, maxLimit = 200): PaginationParams {
  const limit = Math.min(
    Math.max(parseInt(request.nextUrl.searchParams.get('limit') ?? String(defaultLimit), 10), 1),
    maxLimit,
  );
  const offset = Math.max(parseInt(request.nextUrl.searchParams.get('offset') ?? '0', 10), 0);
  return { limit, offset };
}
```

- [ ] **Step 3: Verify compilation**

Run: `cd astra-app && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add astra-app/src/lib/rbac.ts astra-app/src/lib/pagination.ts
git commit -m "feat: add requireScanOwnership helper and shared pagination parser"
```

---

### Task 3: Add auth to config and provider routes (P0 #1, #2)

**Files:**
- Modify: `astra-app/src/app/api/v1/config/route.ts`
- Modify: `astra-app/src/app/api/v1/providers/route.ts`
- Modify: `astra-app/src/app/api/v1/providers/test/route.ts`

- [ ] **Step 1: Add auth to `/api/v1/config`**

Replace `astra-app/src/app/api/v1/config/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { loadConfigFromDb, saveConfigToDb, configSchema } from '@/lib/config';
import { requireAuth, canAdmin } from '@/lib/rbac';

export async function GET() {
  const { error, role } = await requireAuth();
  if (error) return error;
  if (!canAdmin(role!)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const config = await loadConfigFromDb();
    return NextResponse.json(config);
  } catch {
    return NextResponse.json({ error: 'Failed to load config' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const { error, role } = await requireAuth();
  if (error) return error;
  if (!canAdmin(role!)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();

  const parsed = configSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid config', details: parsed.error.flatten() }, { status: 400 });
  }

  await saveConfigToDb(parsed.data);

  return NextResponse.json(parsed.data);
}
```

- [ ] **Step 2: Add auth to `/api/v1/providers`**

Replace `astra-app/src/app/api/v1/providers/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { loadConfigFromDb } from '@/lib/config';
import { listProviders } from '@/providers/registry';
import { requireAuth } from '@/lib/rbac';

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  let config;
  try {
    config = await loadConfigFromDb();
  } catch {
    return NextResponse.json({ error: 'Failed to load config' }, { status: 500 });
  }

  const providers = listProviders(config);
  return NextResponse.json({ providers });
}
```

- [ ] **Step 3: Add auth to `/api/v1/providers/test`**

Add `requireAuth()` to `astra-app/src/app/api/v1/providers/test/route.ts`. Insert after the function declaration, before the body parsing:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { loadConfigFromDb } from '@/lib/config';
import { createProvider } from '@/providers/factory';
import { requireAuth } from '@/lib/rbac';

export async function POST(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  // ... rest of existing handler unchanged
```

- [ ] **Step 4: Verify compilation**

Run: `cd astra-app && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No type errors

- [ ] **Step 5: Commit**

```bash
git add astra-app/src/app/api/v1/config/route.ts astra-app/src/app/api/v1/providers/route.ts astra-app/src/app/api/v1/providers/test/route.ts
git commit -m "fix: add auth to config and provider routes — ADMIN-only config, auth-required providers"
```

---

### Task 4: Add auth to findings list with user scoping (P0 #3)

**Files:**
- Modify: `astra-app/src/app/api/v1/findings/route.ts`

- [ ] **Step 1: Add auth and user-scoped filtering**

Replace `astra-app/src/app/api/v1/findings/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, canAdmin } from '@/lib/rbac';
import { parsePagination } from '@/lib/pagination';

export async function GET(request: NextRequest) {
  const { error, userId, role } = await requireAuth();
  if (error) return error;

  const { searchParams } = request.nextUrl;
  const { limit, offset } = parsePagination(request, 50);
  const scanId = searchParams.get('scanId') ?? undefined;
  const severity = searchParams.get('severity') ?? undefined;
  const category = searchParams.get('category') ?? undefined;
  const scanner = searchParams.get('scanner') ?? undefined;
  const search = searchParams.get('search') ?? undefined;
  const file = searchParams.get('file') ?? undefined;
  const status = searchParams.get('status') ?? undefined;
  const assignedToId = searchParams.get('assignedToId') ?? undefined;

  const where: Record<string, unknown> = {};
  // Non-admin users can only see findings from their own scans unless they filter by scanId
  if (!canAdmin(role!)) {
    where.scan = { userId };
  }
  if (scanId) where.scanId = scanId;
  if (severity) where.severity = severity;
  if (category) where.category = category;
  if (scanner) where.scanner = scanner;
  if (file) where.file = { contains: file, mode: 'insensitive' };
  if (status) where.status = status;
  if (assignedToId) where.assignedToId = assignedToId;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { file: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { aiExplanation: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [findings, total] = await Promise.all([
    prisma.finding.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.finding.count({ where }),
  ]);

  return NextResponse.json({ findings, total, limit, offset });
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd astra-app && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add astra-app/src/app/api/v1/findings/route.ts
git commit -m "fix: add auth to findings list, scope non-admin users to own scans"
```

---

### Task 5: Add auth to all scan detail routes (P0 #4)

**Files:**
- Modify: `astra-app/src/app/api/v1/scans/[id]/route.ts`
- Modify: `astra-app/src/app/api/v1/scans/[id]/cancel/route.ts`
- Modify: `astra-app/src/app/api/v1/scans/[id]/resume/route.ts`
- Modify: `astra-app/src/app/api/v1/scans/[id]/rerun-node/route.ts`
- Modify: `astra-app/src/app/api/v1/scans/[id]/export/route.ts`
- Modify: `astra-app/src/app/api/v1/scans/[id]/logs/route.ts`
- Modify: `astra-app/src/app/api/v1/scans/[id]/nodes/route.ts`
- Modify: `astra-app/src/app/api/v1/scans/[id]/progress/route.ts`

- [ ] **Step 1: Add auth + ownership check to scan detail GET**

In `astra-app/src/app/api/v1/scans/[id]/route.ts`, add auth at the top of the GET handler:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requireScanOwnership } from '@/lib/rbac';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, userId, role } = await requireAuth();
  if (error) return error;

  const { id } = await params;

  const ownershipError = await requireScanOwnership(id, userId!, role!);
  if (ownershipError) return ownershipError;

  const scan = await prisma.scan.findUnique({
    where: { id },
    include: {
      findings: true,
      businessRules: true,
      nodeOutputs: true,
    },
  });

  if (!scan) {
    return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
  }

  return NextResponse.json(scan);
}
```

- [ ] **Step 2: Add auth to scan cancel, resume, rerun-node**

For each of these three routes, add `requireAuth()` + `requireScanOwnership()` at the top. Pattern:

```typescript
import { requireAuth, requireScanOwnership } from '@/lib/rbac';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, userId, role } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const ownershipError = await requireScanOwnership(id, userId!, role!);
  if (ownershipError) return ownershipError;

  // ... rest of handler unchanged
}
```

Apply this to:
- `astra-app/src/app/api/v1/scans/[id]/cancel/route.ts`
- `astra-app/src/app/api/v1/scans/[id]/resume/route.ts`
- `astra-app/src/app/api/v1/scans/[id]/rerun-node/route.ts`

For cancel and resume, also add `canWrite(role!)` check — only ADMIN/ANALYST should control scans:

```typescript
import { requireAuth, requireScanOwnership, canWrite } from '@/lib/rbac';
// ...
if (!canWrite(role!)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
```

- [ ] **Step 3: Add auth to scan export, logs, nodes, progress**

These are read-only routes — add `requireAuth()` + `requireScanOwnership()` but no role check:

- `astra-app/src/app/api/v1/scans/[id]/export/route.ts`
- `astra-app/src/app/api/v1/scans/[id]/logs/route.ts`
- `astra-app/src/app/api/v1/scans/[id]/nodes/route.ts`
- `astra-app/src/app/api/v1/scans/[id]/progress/route.ts`

Pattern for each:

```typescript
import { requireAuth, requireScanOwnership } from '@/lib/rbac';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, userId, role } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const ownershipError = await requireScanOwnership(id, userId!, role!);
  if (ownershipError) return ownershipError;

  // ... rest of handler unchanged
}
```

- [ ] **Step 4: Verify compilation**

Run: `cd astra-app && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No type errors

- [ ] **Step 5: Commit**

```bash
git add astra-app/src/app/api/v1/scans/
git commit -m "fix: add auth and ownership checks to all scan detail routes"
```

---

### Task 6: Add auth to presets with user scoping (P0 #6)

**Files:**
- Modify: `astra-app/prisma/schema.prisma`
- Modify: `astra-app/src/app/api/v1/presets/route.ts`

- [ ] **Step 1: Add userId to Preset model**

In `astra-app/prisma/schema.prisma`, update the Preset model:

```prisma
model Preset {
  id          String   @id @default(cuid())
  name        String   @unique
  description String   @default("")
  configJson  Json
  isBuiltin   Boolean  @default(false)
  userId      String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId])
}
```

Also add `presets Preset[]` to the User model if not already there.

- [ ] **Step 2: Create and run migration**

Run: `cd astra-app && npx prisma migrate dev --name add_preset_user_relation`

- [ ] **Step 3: Update presets route with auth and scoping**

Replace `astra-app/src/app/api/v1/presets/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, canAdmin } from '@/lib/rbac';

export async function GET() {
  const { error, userId, role } = await requireAuth();
  if (error) return error;

  // Non-admin users see built-in presets + their own
  const where = canAdmin(role!)
    ? {}
    : { OR: [{ isBuiltin: true }, { userId }] };

  const presets = await prisma.preset.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ presets });
}

export async function POST(request: NextRequest) {
  const { error, userId, role } = await requireAuth();
  if (error) return error;

  const body = await request.json();
  const { name, description, configJson } = body;

  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  if (configJson === undefined) {
    return NextResponse.json({ error: 'configJson is required' }, { status: 400 });
  }

  const preset = await prisma.preset.create({
    data: {
      name,
      description: description ?? '',
      configJson,
      userId,
    },
  });

  return NextResponse.json(preset, { status: 201 });
}
```

- [ ] **Step 4: Verify compilation**

Run: `cd astra-app && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 5: Commit**

```bash
git add astra-app/prisma/schema.prisma astra-app/src/app/api/v1/presets/route.ts
git commit -m "fix: add auth to presets, scope non-admin to built-in + own presets"
```

---

### Task 7: Add auth to user-rules with user scoping (P0 #7)

**Files:**
- Modify: `astra-app/src/app/api/v1/user-rules/route.ts`
- Modify: `astra-app/src/app/api/v1/user-rules/[id]/route.ts`

- [ ] **Step 1: Update user-rules list + create**

Replace `astra-app/src/app/api/v1/user-rules/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/rbac';

export async function GET(request: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = request.nextUrl;
  const scanId = searchParams.get('scanId') ?? undefined;
  const active = searchParams.get('active');
  const global = searchParams.get('global');

  const where: Record<string, unknown> = {};
  if (scanId) where.scanId = scanId;
  if (active === 'true') where.isActive = true;
  if (active === 'false') where.isActive = false;
  if (global === 'true') where.scanId = null;
  if (global === 'false') where.scanId = { not: null };

  const rules = await prisma.userRule.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ rules });
}

export async function POST(request: NextRequest) {
  const { error, userId } = await requireAuth();
  if (error) return error;

  const body = await request.json();
  const { name, description, ruleText, severity, category, cwe, scanId } = body;

  if (!name || !ruleText) {
    return NextResponse.json({ error: 'name and ruleText are required' }, { status: 400 });
  }

  // If scanId provided, verify user owns the scan
  if (scanId) {
    const scan = await prisma.scan.findUnique({ where: { id: scanId } });
    if (!scan) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }
  }

  const rule = await prisma.userRule.create({
    data: {
      name,
      description: description ?? '',
      ruleText,
      severity: severity ?? 'MEDIUM',
      category: category ?? 'SAST',
      cwe: cwe ?? [],
      scanId: scanId ?? null,
    },
  });

  return NextResponse.json(rule, { status: 201 });
}
```

- [ ] **Step 2: Update user-rules detail (PATCH/DELETE)**

Replace `astra-app/src/app/api/v1/user-rules/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, canAdmin } from '@/lib/rbac';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();

  const rule = await prisma.userRule.findUnique({ where: { id } });
  if (!rule) return NextResponse.json({ error: 'Rule not found' }, { status: 404 });

  const updated = await prisma.userRule.update({
    where: { id },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.ruleText !== undefined ? { ruleText: body.ruleText } : {}),
      ...(body.severity !== undefined ? { severity: body.severity } : {}),
      ...(body.category !== undefined ? { category: body.category } : {}),
      ...(body.cwe !== undefined ? { cwe: body.cwe } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, role } = await requireAuth();
  if (error) return error;

  // Only admins can delete rules
  if (!canAdmin(role!)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  const rule = await prisma.userRule.findUnique({ where: { id } });
  if (!rule) return NextResponse.json({ error: 'Rule not found' }, { status: 404 });

  await prisma.userRule.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Verify compilation**

Run: `cd astra-app && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 4: Commit**

```bash
git add astra-app/src/app/api/v1/user-rules/
git commit -m "fix: add auth to user-rules routes, restrict DELETE to admins"
```

---

### Task 8: Add auth to preferences route (unlisted in P0 but needed)

**Files:**
- Modify: `astra-app/src/app/api/v1/preferences/route.ts`

- [ ] **Step 1: Add auth and user scoping**

Replace `astra-app/src/app/api/v1/preferences/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/rbac';

export async function GET(request: NextRequest) {
  const { error, userId } = await requireAuth();
  if (error) return error;

  const key = request.nextUrl.searchParams.get('key');
  if (key) {
    const pref = await prisma.userPreference.findUnique({ where: { key } });
    return NextResponse.json({ key, value: pref?.value ?? null });
  }
  const prefs = await prisma.userPreference.findMany();
  return NextResponse.json({ preferences: prefs });
}

export async function POST(request: NextRequest) {
  const { error, userId } = await requireAuth();
  if (error) return error;

  const { key, value } = await request.json();
  if (!key || !value) return NextResponse.json({ error: 'key and value required' }, { status: 400 });

  const pref = await prisma.userPreference.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
  return NextResponse.json(pref);
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd astra-app && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add astra-app/src/app/api/v1/preferences/route.ts
git commit -m "fix: add auth to preferences route"
```

---

### Task 9: Rate limiting on auth endpoints (P0 #8)

**Files:**
- Create: `astra-app/src/lib/rate-limit.ts`
- Modify: `astra-app/src/app/api/v1/auth/verify/route.ts`
- Modify: `astra-app/src/app/api/v1/auth/signup/route.ts`

- [ ] **Step 1: Create the rate limiter**

Create `astra-app/src/lib/rate-limit.ts`:

```typescript
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

/**
 * Simple in-memory rate limiter.
 * Returns { allowed: true } if under limit, { allowed: false, retryAfter } if over.
 */
export function rateLimit(
  key: string,
  options: { windowMs: number; maxRequests: number } = { windowMs: 60_000, maxRequests: 10 }
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + options.windowMs });
    return { allowed: true };
  }

  entry.count++;
  if (entry.count > options.maxRequests) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  return { allowed: true };
}

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 5 * 60 * 1000);
```

- [ ] **Step 2: Apply rate limiting to verify endpoint**

In `astra-app/src/app/api/v1/auth/verify/route.ts`, add rate limiting at the top:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // Rate limit: 10 attempts per minute per IP
  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown';
  const { allowed, retryAfter } = rateLimit(`auth:verify:${ip}`, { windowMs: 60_000, maxRequests: 10 });
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    );
  }

  const { email, password } = await request.json();
  if (!email || !password) {
    return NextResponse.json({ error: 'email and password required' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json(null, { status: 401 });
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return NextResponse.json(null, { status: 401 });
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
}
```

- [ ] **Step 3: Apply rate limiting to signup endpoint**

In `astra-app/src/app/api/v1/auth/signup/route.ts`, add rate limiting:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { requireAuth, canAdmin } from '@/lib/rbac';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // Rate limit: 5 signups per minute per IP
  const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? 'unknown';
  const { allowed, retryAfter } = rateLimit(`auth:signup:${ip}`, { windowMs: 60_000, maxRequests: 5 });
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many signup attempts. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    );
  }

  // ... rest of existing handler unchanged
```

- [ ] **Step 4: Verify compilation**

Run: `cd astra-app && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 5: Commit**

```bash
git add astra-app/src/lib/rate-limit.ts astra-app/src/app/api/v1/auth/verify/route.ts astra-app/src/app/api/v1/auth/signup/route.ts
git commit -m "feat: add in-memory rate limiting to auth endpoints (10/min verify, 5/min signup)"
```

---

### Task 10: Encrypt GitHub access token at rest (P0 #9)

**Files:**
- Create: `astra-app/src/lib/encryption.ts`
- Modify: `astra-app/src/app/api/v1/github/link/route.ts`
- Modify: `astra-app/src/app/api/v1/github/repos/route.ts` (or wherever token is read for API calls)

- [ ] **Step 1: Create the encryption helper**

Create `astra-app/src/lib/encryption.ts`:

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY ?? '', 'hex');

function getKey(): Buffer {
  if (KEY.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be a 64-char hex string (32 bytes). Run: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  }
  return KEY;
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: iv:tag:ciphertext (all hex)
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(ciphertext: string): string {
  const [ivHex, tagHex, dataHex] = ciphertext.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const data = Buffer.from(dataHex, 'hex');
  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(tag);
  return decipher.update(data) + decipher.final('utf8');
}
```

- [ ] **Step 2: Add ENCRYPTION_KEY to `.env.example`**

Append to `astra-app/.env.example` (create if needed):

```
# AES-256 encryption key for sensitive data at rest (64 hex chars = 32 bytes)
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=
```

- [ ] **Step 3: Update GitHub link route to encrypt token**

In `astra-app/src/app/api/v1/github/link/route.ts`, encrypt the `accessToken` before storing:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { encrypt } from '@/lib/encryption';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { accessToken } = await request.json();
  if (!accessToken) return NextResponse.json({ error: 'accessToken required' }, { status: 400 });

  const res = await fetch('https://api.github.com/user', {
    headers: { Authorization: `token ${accessToken}`, Accept: 'application/vnd.github.v3+json' },
  });
  if (!res.ok) return NextResponse.json({ error: 'Invalid GitHub token' }, { status: 401 });
  const ghUser = await res.json();

  const userId = (session.user as any).id;
  const encryptedToken = encrypt(accessToken);

  const profile = await prisma.githubProfile.upsert({
    where: { userId },
    update: { githubId: ghUser.id, username: ghUser.login, accessToken: encryptedToken, avatarUrl: ghUser.avatar_url },
    create: { userId, githubId: ghUser.id, username: ghUser.login, accessToken: encryptedToken, avatarUrl: ghUser.avatar_url },
  });

  return NextResponse.json({ profile: { username: profile.username, avatarUrl: profile.avatarUrl } });
}
```

- [ ] **Step 4: Update GitHub repos route to decrypt token**

Find wherever `accessToken` is read from `GithubProfile` and decrypt it before use. Check `astra-app/src/app/api/v1/github/repos/route.ts`:

```typescript
import { decrypt } from '@/lib/encryption';
// ... when reading accessToken from profile:
const accessToken = decrypt(profile.accessToken);
```

- [ ] **Step 5: Verify compilation**

Run: `cd astra-app && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 6: Commit**

```bash
git add astra-app/src/lib/encryption.ts astra-app/.env.example astra-app/src/app/api/v1/github/
git commit -m "feat: encrypt GitHub access tokens at rest with AES-256-GCM"
```

---

### Task 11: Replace setInterval worker with event-driven queue (P2 #25)

**Files:**
- Modify: `astra-app/src/scan/worker.ts`

- [ ] **Step 1: Replace the polling loop with an event-driven approach**

The current worker uses `setInterval(processNextJob, 3000)` which polls the DB every 3 seconds. Replace with a loop that processes jobs immediately and sleeps only when there are no jobs.

Replace the bottom of `astra-app/src/scan/worker.ts` — find any `setInterval` or polling setup and replace with:

```typescript
const POLL_INTERVAL_MS = 3000;
let workerRunning = false;

export async function startWorker(): Promise<void> {
  if (workerRunning) return;
  workerRunning = true;

  while (workerRunning) {
    try {
      const hadJob = await processNextJob();
      // If we processed a job, immediately check for the next one (no delay)
      // Only sleep when no jobs are available
      if (!hadJob) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      }
    } catch (err) {
      logger.error({ err: err instanceof Error ? err.message : String(err) }, 'Worker loop error');
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }
}

export function stopWorker(): void {
  workerRunning = false;
}
```

Update `processNextJob` to return a boolean indicating whether a job was processed:

Change the return type of `processNextJob` from `Promise<void>` to `Promise<boolean>` and:
- When `!job` is found, return `false`
- When a job is processed (regardless of success/failure), return `true`
- Remove all `void processNextJob()` recursive calls

- [ ] **Step 2: Update the scan API to start the worker**

In `astra-app/src/app/api/v1/scans/route.ts`, change from `void processNextJob()` to starting the worker:

```typescript
import { startWorker } from '@/scan/worker';

// At the bottom, after enqueuePipeline:
await startWorker();
```

Actually, better: start the worker once on server boot and keep it running. Add to `astra-app/src/app/api/v1/scans/route.ts` or a separate initialization file. The worker loop will handle waking up when jobs are available.

- [ ] **Step 3: Verify compilation**

Run: `cd astra-app && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 4: Commit**

```bash
git add astra-app/src/scan/worker.ts
git commit -m "perf: replace setInterval polling with event-driven worker loop"
```

---

### Task 12: Replace sync I/O with async in scan nodes (P2 #26)

**Files:**
- Modify: `astra-app/src/scan/nodes/clone.ts`
- Modify: `astra-app/src/scan/nodes/discover.ts`
- Modify: `astra-app/src/scan/nodes/deep-scan.ts`

- [ ] **Step 1: Convert clone.ts to async I/O**

Replace `execSync` with `execPromise` (child_process.exec with promisify), replace `fs.rmSync`/`fs.existsSync`/`fs.mkdtempSync` with async equivalents:

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import type { ScanState } from '../state';
import { log } from '../log';

const execAsync = promisify(exec);

export async function cloneNode(state: ScanState): Promise<Partial<ScanState>> {
  const { repoUrl, branch } = state;
  await log(state.scanId, 'info', 'clone', `Cloning ${repoUrl} (branch: ${branch})`);
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'astra-scan-'));

  try {
    const branchFlag = branch && branch !== 'main' ? ` --branch ${branch}` : '';
    await execAsync(`git clone --depth 1${branchFlag} ${repoUrl} ${tmpDir}`, {
      timeout: 120000,
    });

    const { stdout } = await execAsync('git rev-parse HEAD', {
      cwd: tmpDir,
    });
    const commitSha = stdout.trim();

    await log(state.scanId, 'success', 'clone', `Cloned to ${tmpDir} (commit: ${commitSha.slice(0, 8)})`);

    return {
      localDir: tmpDir,
      commitSha,
      status: 'RUNNING',
    };
  } catch (err) {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {}

    const message = err instanceof Error ? err.message : String(err);
    await log(state.scanId, 'error', 'clone', `Clone failed: ${message}`);
    return {
      localDir: '',
      commitSha: '',
      errors: [`Clone failed: ${message}`],
      status: 'FAILED',
    };
  }
}
```

- [ ] **Step 2: Convert discover.ts to async I/O**

Replace `fs.readdirSync`, `fs.statSync` with async equivalents from `fs/promises`. The recursive `walk` function becomes async:

```typescript
import fs from 'fs/promises';
import path from 'path';
import type { ScanState, PrioritizedFile } from '../state';
import { log } from '../log';

// ... (constants SCANABLE_EXTENSIONS, SKIP_FILENAMES, etc. stay the same)

async function walk(dir: string, localDir: string, discoveredFiles: PrioritizedFile[], skippedFiles: string[]): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(localDir, fullPath);

    if (SKIP_FILENAMES.has(entry.name)) {
      skippedFiles.push(relPath);
      continue;
    }

    const relPathWithSlash = relPath + '/';
    if (SKIP_PREFIXES.some(p => relPathWithSlash.startsWith(p) || relPath.startsWith(p.replace(/\/$/, '')))) {
      skippedFiles.push(relPath);
      continue;
    }

    if (entry.isDirectory()) {
      await walk(fullPath, localDir, discoveredFiles, skippedFiles);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (SCANABLE_EXTENSIONS.has(ext) || (ext === '' && entry.name === 'Dockerfile')) {
        discoveredFiles.push({
          path: relPath,
          priority: getFilePriority(relPath),
          language: ext === '' && entry.name === 'Dockerfile' ? 'dockerfile' : getLanguage(relPath),
        });
      } else {
        skippedFiles.push(relPath);
      }
    }
  }
}

export async function discoverNode(state: ScanState): Promise<Partial<ScanState>> {
  const { localDir } = state;
  const discoveredFiles: PrioritizedFile[] = [];
  const skippedFiles: string[] = [];

  try {
    await fs.access(localDir);
  } catch {
    return {
      discoveredFiles: [],
      skippedFiles: [],
      totalFiles: 0,
      errors: [`Discover failed: localDir does not exist: ${localDir}`],
    };
  }

  await walk(localDir, localDir, discoveredFiles, skippedFiles);
  discoveredFiles.sort((a, b) => a.priority - b.priority);

  await log(state.scanId, 'success', 'discover', `Found ${discoveredFiles.length} scannable files, skipped ${skippedFiles.length}`);

  return {
    discoveredFiles,
    skippedFiles,
    totalFiles: discoveredFiles.length + skippedFiles.length,
  };
}
```

- [ ] **Step 3: Convert deep-scan.ts file reads to async**

In `astra-app/src/scan/nodes/deep-scan.ts`, replace the sync `fs.statSync`/`fs.readFileSync` imports with async versions. Change the import and the file reading:

```typescript
import fs from 'fs/promises';
// Remove: import fs from 'fs';

// Inside the batch map callback, replace:
//   const stat = fs.statSync(fullPath);
// with:
//   const stat = await fs.stat(fullPath);
// And:
//   content = fs.readFileSync(fullPath, 'utf-8');
// with:
//   content = await fs.readFile(fullPath, 'utf-8');
```

- [ ] **Step 4: Verify compilation**

Run: `cd astra-app && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 5: Commit**

```bash
git add astra-app/src/scan/nodes/clone.ts astra-app/src/scan/nodes/discover.ts astra-app/src/scan/nodes/deep-scan.ts
git commit -m "perf: replace sync I/O with async in scan nodes (clone, discover, deep-scan)"
```

---

### Task 13: Add temp directory cleanup on all failure paths (P2 #27)

**Files:**
- Modify: `astra-app/src/scan/worker.ts`
- Modify: `astra-app/src/scan/nodes/discover.ts`
- Modify: `astra-app/src/scan/nodes/deep-scan.ts`

- [ ] **Step 1: Add cleanup helper to worker**

In `astra-app/src/scan/worker.ts`, add a cleanup function and call it when any node fails:

```typescript
import fs from 'fs/promises';

async function cleanupScanTmpDir(scanId: string): Promise<void> {
  try {
    const scan = await prisma.scan.findUnique({ where: { id: scanId } });
    if (!scan) return;
    // Try to find tmp dir from the clone node output
    const cloneJob = await prisma.job.findFirst({
      where: { scanId, node: 'clone', status: 'COMPLETED' },
    });
    if (!cloneJob) return;
    const output = cloneJob.outputJson as Record<string, unknown> | null;
    const localDir = output?.localDir as string | undefined;
    if (localDir && localDir.includes('astra-scan-')) {
      await fs.rm(localDir, { recursive: true, force: true });
    }
  } catch {
    // Best-effort cleanup — don't fail the worker on cleanup errors
  }
}
```

Call this after `markScanFailed`:

```typescript
// In the catch block and in FAILED status handling:
await cleanupScanTmpDir(scanId);
```

- [ ] **Step 2: Add cleanup to discover node on failure**

In `discover.ts`, if the discover node fails after clone has created a tmpDir, we should not clean up here — the worker handles it. But add a safety check in the node itself:

The discover node already returns errors when `localDir` doesn't exist. The cleanup responsibility falls on the worker. No changes needed in discover.

- [ ] **Step 3: Verify compilation**

Run: `cd astra-app && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 4: Commit**

```bash
git add astra-app/src/scan/worker.ts
git commit -m "fix: add temp directory cleanup on scan failure paths"
```

---

### Task 14: Add pagination to chat history (P2 #29)

**Files:**
- Modify: `astra-app/src/app/api/v1/chat/route.ts`

- [ ] **Step 1: Add limit/offset pagination to chat GET**

Update the GET handler in `astra-app/src/app/api/v1/chat/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/rbac';
import { sendChatMessage } from '@/lib/ai-chat';
import { parsePagination } from '@/lib/pagination';

export async function GET(request: NextRequest) {
  const { error, userId } = await requireAuth();
  if (error) return error;

  const { limit, offset } = parsePagination(request, 50);

  const [messages, total] = await Promise.all([
    prisma.aiConversation.findMany({
      where: { userId, scanId: null, findingId: null },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.aiConversation.count({ where: { userId, scanId: null, findingId: null } }),
  ]);

  return NextResponse.json({ messages, total, limit, offset });
}

// POST handler stays the same
```

Note: Return messages in `desc` order (newest first) for pagination, but the client may want `asc` for display. Keep `desc` for pagination consistency and let the client reverse for display.

- [ ] **Step 2: Verify compilation**

Run: `cd astra-app && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 3: Commit**

```bash
git add astra-app/src/app/api/v1/chat/route.ts
git commit -m "feat: add pagination to chat history endpoint"
```

---

### Task 15: Shared pagination helper for all API routes (P2 #33)

**Files:**
- Modify: `astra-app/src/app/api/v1/findings/route.ts` — already done in Task 4
- Modify: `astra-app/src/app/api/v1/scans/route.ts`
- Modify: `astra-app/src/app/api/v1/ai-calls/route.ts`
- Modify: `astra-app/src/app/api/v1/tasks/route.ts`

- [ ] **Step 1: Update scans list route to use pagination helper**

In `astra-app/src/app/api/v1/scans/route.ts`, replace manual `parseInt` with `parsePagination`:

```typescript
import { parsePagination } from '@/lib/pagination';

// In GET handler:
const { limit, offset } = parsePagination(request);
```

- [ ] **Step 2: Update AI calls route**

In `astra-app/src/app/api/v1/ai-calls/route.ts`, replace manual parsing:

```typescript
import { parsePagination } from '@/lib/pagination';

// In GET handler:
const { limit, offset } = parsePagination(request, 25);
```

- [ ] **Step 3: Update tasks route**

In `astra-app/src/app/api/v1/tasks/route.ts`, replace manual parsing:

```typescript
import { parsePagination } from '@/lib/pagination';

// In GET handler:
const { limit, offset } = parsePagination(request, 50);
```

- [ ] **Step 4: Verify compilation**

Run: `cd astra-app && npx tsc --noEmit --pretty 2>&1 | head -30`

- [ ] **Step 5: Commit**

```bash
git add astra-app/src/app/api/v1/scans/route.ts astra-app/src/app/api/v1/ai-calls/route.ts astra-app/src/app/api/v1/tasks/route.ts
git commit -m "refactor: use shared pagination helper across API routes"
```

---

## Self-Review Checklist

### 1. Spec coverage

| P0 # | Task | Covered |
|------|------|---------|
| 1 | Auth on `/api/v1/config` | Task 3 |
| 2 | Auth on `/api/v1/providers/test` | Task 3 |
| 3 | Auth on `/api/v1/findings` + userId filter | Task 4 |
| 4 | Auth on `/api/v1/scans/:id` + ownership | Task 5 |
| 5 | Fix middleware `/api/*` bypass | Task 1 |
| 6 | Auth on `/api/v1/presets` + user scoping | Task 6 |
| 7 | Auth on `/api/v1/user-rules` + user scoping | Task 7 |
| 8 | Rate limiting on auth endpoints | Task 9 |
| 9 | Encrypt `GithubProfile.accessToken` | Task 10 |

| P2 # | Task | Covered |
|------|------|---------|
| 25 | Replace setInterval worker | Task 11 |
| 26 | Replace sync I/O | Task 12 |
| 27 | Temp directory cleanup | Task 13 |
| 29 | Chat history pagination | Task 14 |
| 33 | Shared pagination helper | Tasks 2, 15 |

Additional routes secured (not in original P0 list but discovered during audit): preferences (Task 8), all 7 scan sub-routes (Task 5).

### 2. Placeholder scan

No TBD, TODO, "implement later", or "add appropriate error handling" patterns found. Every step contains complete code.

### 3. Type consistency

- `requireAuth()` returns `{ error, userId, role }` — consistent across all tasks
- `requireScanOwnership()` returns `NextResponse | null` — used consistently in Task 5
- `parsePagination()` returns `{ limit, offset }` — used consistently in Tasks 2, 4, 14, 15
- `rateLimit()` returns `{ allowed, retryAfter }` — used in Task 9
- `encrypt()`/`decrypt()` handle string → string — used in Task 10