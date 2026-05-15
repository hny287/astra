# Configure RBAC Permissions

**Last updated:** 2026-05-15 | **Version:** v2.23.0

This guide explains Astra's Role-Based Access Control (RBAC) system and how to configure permissions.

---

## Overview

Astra uses three roles with increasing permissions:

```
VIEWER → ANALYST → ADMIN
```

Each role inherits permissions from the previous role.

---

## Role Definitions

### VIEWER

**Purpose:** Stakeholders who need visibility into security posture.

**Permissions:**
- View own scans and findings
- Export findings
- Use AI chat (read-only)
- Update own preferences

**Cannot:**
- Create or modify scans
- Triage findings
- Change system configuration

---

### ANALYST

**Purpose:** Security team members who actively triage and remediate.

**Permissions:**
- All VIEWER permissions
- Create and manage own scans
- Triage findings (change status, assign, comment)
- Create and manage tasks
- Use AI chat (full access)
- Export findings

**Cannot:**
- Manage users
- Configure AI providers
- Change system settings
- View other users' scans (unless admin)

---

### ADMIN

**Purpose:** Platform administrators and security leads.

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

## Step 1: Navigate to User Management

1. Click **Settings** in the sidebar (ADMIN only)
2. Navigate to **Users** tab

---

## Step 2: View Current Roles

The user list shows each user's role:

| Email | Name | Role | Created |
|-------|------|------|---------|
| admin@astra.dev | Admin User | ADMIN | 2026-05-01 |
| analyst@astra.dev | Security Analyst | ANALYST | 2026-05-05 |
| viewer@astra.dev | Stakeholder | VIEWER | 2026-05-10 |

---

## Step 3: Change User Role

1. Click on the user
2. Click the **Role** dropdown
3. Select new role
4. Click **Save**

The change takes effect immediately.

---

## Scan Ownership

### Non-Admin Users

- See only scans they created
- Cannot view other users' scans
- Findings are filtered by scan ownership

### Admin Users

- See all scans regardless of owner
- Can reassign scan ownership
- Can transfer scans between users

---

## API-Level Enforcement

RBAC is enforced on every API route:

### Example: Create Scan

```typescript
// POST /api/v1/scans
// Requires: ANALYST or ADMIN

if (!canWrite(user)) {
  return res.status(403).json({ error: 'Forbidden' });
}
```

### Example: Delete User

```typescript
// DELETE /api/v1/users/:id
// Requires: ADMIN

if (!canAdmin(user)) {
  return res.status(403).json({ error: 'Forbidden' });
}
```

### Example: View All Scans

```typescript
// GET /api/v1/scans
// ADMIN: sees all scans
// ANALYST/VIEWER: sees only own scans

if (user.role === 'ADMIN') {
  scans = await prisma.scan.findMany();
} else {
  scans = await prisma.scan.findMany({ where: { userId: user.id } });
}
```

---

## Custom Permissions (Advanced)

For fine-grained control, admins can configure custom rules:

1. Navigate to **Settings** → **Security Rules**
2. Add custom RBAC rules
3. Apply to specific routes or actions

Example custom rule:
```json
{
  "name": "Require ADMIN for export",
  "route": "/api/v1/scans/*/export",
  "requiredRole": "ADMIN"
}
```

---

## Best Practices

### Principle of Least Privilege

- Start users as VIEWER
- Promote to ANALYST when needed
- Reserve ADMIN for platform operators

### Regular Audits

- Review user roles quarterly
- Remove access for departed employees
- Demote users who no longer need elevated access

### Separation of Duties

- Multiple admins for redundancy
- Analysts can triage but not delete scans
- Viewers can report but not modify

---

## Troubleshooting

### User Cannot Access Scan

**Cause:** Scan ownership restriction

**Solution:**
1. Verify user created the scan
2. Admin can reassign ownership if needed
3. Or promote user to ADMIN for full access

### User Cannot Triage Finding

**Cause:** VIEWER role cannot modify findings

**Solution:**
1. Promote user to ANALYST
2. Or have an analyst make the change

### 403 Forbidden on API Call

**Cause:** Insufficient permissions

**Solution:**
1. Check required role for the endpoint
2. Promote user if appropriate
3. Use admin account for admin-only operations

---

## See Also

- [Add a New User](./add-user.md)
- [Security Model](../explanation/security/rbac.md)
- [Scan Ownership](../explanation/security/ownership.md)
