# RBAC Model

**Last updated:** 2026-05-15 | **Version:** v2.23.0

Role-Based Access Control (RBAC) implementation in Astra.

---

## Overview

Astra implements three roles with increasing permissions:

```
VIEWER → ANALYST → ADMIN
```

Each role inherits permissions from the previous role.

---

## Role Definitions

### VIEWER

**Purpose:** Stakeholders who need visibility into security posture.

**Typical Users:**
- Project managers
- Compliance officers
- External auditors
- Junior team members

**Permissions:**
- View own scans and findings
- Export findings
- Use AI chat (read-only)
- Update personal preferences

---

### ANALYST

**Purpose:** Security team members who actively triage and remediate.

**Typical Users:**
- Security engineers
- Application security analysts
- Senior developers

**Permissions:**
- All VIEWER permissions
- Create and manage own scans
- Triage findings (change status, assign, comment)
- Create and manage tasks
- Use AI chat (full access)
- Export findings

---

### ADMIN

**Purpose:** Platform administrators and security leads.

**Typical Users:**
- Security team leads
- Platform administrators
- CISO office

**Permissions:**
- All ANALYST permissions
- View all scans (regardless of ownership)
- Manage users (create, edit, delete)
- Configure AI providers
- Modify system configuration
- Manage security rules
- Access observability logs
- Delete any scan or finding

---

## Permission Matrix

| Permission | VIEWER | ANALYST | ADMIN |
|------------|--------|---------|-------|
| View own scans | ✅ | ✅ | ✅ |
| View all scans | ❌ | ❌ | ✅ |
| Create scans | ❌ | ✅ | ✅ |
| Delete own scans | ❌ | ✅ | ✅ |
| Delete any scan | ❌ | ❌ | ✅ |
| Triage findings | ❌ | ✅ | ✅ |
| Assign findings | ❌ | ✅ | ✅ |
| Create tasks | ❌ | ✅ | ✅ |
| Manage users | ❌ | ❌ | ✅ |
| Configure providers | ❌ | ❌ | ✅ |
| System config | ❌ | ❌ | ✅ |
| Observability | ❌ | ❌ | ✅ |

---

## Implementation

### Middleware Enforcement

```typescript
// src/middleware.ts
export function canWrite(user: User): boolean {
  return user.role === 'ANALYST' || user.role === 'ADMIN';
}

export function canAdmin(user: User): boolean {
  return user.role === 'ADMIN';
}
```

### API Route Protection

```typescript
// POST /api/v1/scans
export async function POST(request: Request) {
  const user = await requireAuth(request);

  if (!canWrite(user)) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  // ... create scan
}

// DELETE /api/v1/users/:id
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const user = await requireAuth(request);

  if (!canAdmin(user)) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  // ... delete user
}
```

### Data Filtering

```typescript
// GET /api/v1/scans
export async function GET(request: Request) {
  const user = await requireAuth(request);

  let whereClause = {};
  if (user.role !== 'ADMIN') {
    // Non-admin users only see their own scans
    whereClause = { userId: user.id };
  }

  const scans = await prisma.scan.findMany({ where: whereClause });
  return json({ scans });
}
```

---

## Scan Ownership

### Ownership Model

- Scans are owned by the user who created them
- Non-admin users can only see their own scans
- Admin users can see all scans

### Transfer Ownership

Admins can transfer scan ownership:

```typescript
// PATCH /api/v1/scans/:id/transfer
{
  "newOwnerId": "user-xyz123"
}
```

---

## Finding Assignment

### Assignment Rules

- ANALYST and ADMIN can assign findings
- VIEWER cannot assign
- Findings can be assigned to any user

### Visibility

- Assigned findings visible to assignee regardless of scan ownership
- This enables cross-team collaboration

---

## Best Practices

### Principle of Least Privilege

1. Start users as VIEWER
2. Promote to ANALYST when active triage needed
3. Reserve ADMIN for platform operators

### Regular Audits

1. Review user roles quarterly
2. Remove access for departed employees
3. Demote users who no longer need elevated access

### Separation of Duties

1. Multiple admins for redundancy
2. Analysts can triage but not delete scans
3. Viewers can report but not modify

---

## Authentication Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User submits credentials                                        │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────────┐                                            │
│  │  NextAuth v5    │                                            │
│  │  Credentials    │                                            │
│  │  Provider       │                                            │
│  └────────┬────────┘                                            │
│           │                                                      │
│           ▼                                                      │
│  ┌─────────────────┐                                            │
│  │  Verify         │                                            │
│  │  passwordHash   │                                            │
│  │  (bcrypt)       │                                            │
│  └────────┬────────┘                                            │
│           │                                                      │
│           ▼                                                      │
│  ┌─────────────────┐                                            │
│  │  Create JWT     │                                            │
│  │  Session        │                                            │
│  │  (includes role)│                                            │
│  └────────┬────────┘                                            │
│           │                                                      │
│           ▼                                                      │
│  ┌─────────────────┐                                            │
│  │  API Routes     │                                            │
│  │  Check role     │                                            │
│  │  on each request│                                            │
│  └─────────────────┘                                            │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Troubleshooting

### 403 Forbidden

**Cause:** Insufficient role for requested action

**Solution:**
1. Check required role for endpoint
2. Request role elevation from admin
3. Use admin account for admin-only operations

### User Cannot See Scan

**Cause:** Scan ownership restriction

**Solution:**
1. Verify user created the scan
2. Admin can reassign ownership
3. Or promote user to ADMIN

---

## See Also

- [Add User How-to](../../how-to/add-user.md)
- [Configure RBAC How-to](../../how-to/configure-rbac.md)
- [Scan Ownership](./ownership.md)
- [User Schema](../../reference/schema/user.md)
