# Scan Ownership

**Last updated:** 2026-05-15 | **Version:** v2.23.0

How Astra manages scan ownership and visibility.

---

## Ownership Model

Every scan is owned by the user who created it:

```typescript
model Scan {
  userId String?
  user   User? @relation(fields: [userId], references: [id], onDelete: SetNull)
}
```

---

## Visibility Rules

### Admin Users

- See **all scans** in the system
- Can view, edit, delete any scan
- Can transfer ownership

### Non-Admin Users (ANALYST, VIEWER)

- See **only their own scans**
- Cannot view scans created by others
- API responses filtered by `userId`

---

## Implementation

### API-Level Filtering

```typescript
// GET /api/v1/scans
export async function GET(request: Request) {
  const user = await requireAuth(request);

  let whereClause = {};

  if (user.role !== 'ADMIN') {
    // Non-admin users only see their own scans
    whereClause = { userId: user.id };
  }

  const scans = await prisma.scan.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' }
  });

  return json({ scans });
}
```

### Finding Inheritance

Findings inherit scan visibility:

```typescript
// GET /api/v1/findings
export async function GET(request: Request) {
  const user = await requireAuth(request);

  let scanWhereClause = {};

  if (user.role !== 'ADMIN') {
    scanWhereClause = { userId: user.id };
  }

  const findings = await prisma.finding.findMany({
    where: {
      scan: scanWhereClause
    }
  });

  return json({ findings });
}
```

---

## Use Cases

### Multi-Tenant Isolation

Different teams can use the same Astra instance without seeing each other's scans:

```
Team A: admin@astra.dev → sees only Team A scans
Team B: analyst@company.com → sees only Team B scans
Admin: security-lead@astra.dev → sees all scans
```

### Compliance

Auditors can be given VIEWER access to specific scans without exposing the entire system.

### Personal Projects

Developers can scan personal projects without cluttering the global scan list.

---

## Ownership Transfer

Admins can transfer scan ownership:

### API

```typescript
// PATCH /api/v1/scans/:id/transfer
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await requireAuth(request);

  if (!canAdmin(user)) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const { newOwnerId } = await request.json();

  await prisma.scan.update({
    where: { id: params.id },
    data: { userId: newOwnerId }
  });

  return json({ success: true });
}
```

### UI Flow

1. Admin navigates to scan
2. Clicks **Transfer Ownership**
3. Selects new owner from dropdown
4. Confirms transfer

---

## Orphaned Scans

When a user is deleted:

```typescript
model User {
  scans Scan[] @relation(fields: [userId], references: [id], onDelete: SetNull)
}
```

- Scans are preserved
- `userId` set to `NULL`
- Scans become visible only to ADMIN users

---

## Edge Cases

### User Creates Scan, Then Leaves

- Scans remain in system
- Orphaned (userId = NULL)
- Admins can reassign or delete

### Team Collaboration

For team visibility:
1. Create shared account (team-security@company.com)
2. All team members use shared credentials
3. Scans owned by team account

### Admin Creates Scan for User

Admins can create scans on behalf of users:

1. Admin creates scan
2. Sets `userId` to target user
3. Scan appears in user's list

---

## Security Considerations

### Data Isolation

Ownership ensures:
- Teams cannot see each other's vulnerabilities
- Sensitive code analysis remains private
- Compliance boundaries maintained

### Admin Override

Admins can see everything:
- Necessary for platform management
- Audit logs track admin access
- Trust boundary clearly defined

---

## Best Practices

### For Organizations

1. **Use groups:** Create team accounts for shared visibility
2. **Regular audits:** Review scan ownership quarterly
3. **Document transfers:** Log ownership changes

### For Admins

1. **Minimal access:** Only grant ADMIN when necessary
2. **Transfer on departure:** Reassign scans before deleting users
3. **Monitor orphaned:** Clean up orphaned scans periodically

---

## Troubleshooting

### User Cannot See Expected Scan

**Possible causes:**
1. Scan created by different user
2. User role changed after scan creation
3. Scan was transferred

**Solutions:**
1. Admin can verify ownership
2. Transfer ownership if needed
3. Check scan creator in database

### Scan Shows Wrong Owner

**Cause:** Ownership transfer without notification

**Solution:**
1. Check audit history
2. Contact admin for clarification
3. Transfer back if error

---

## See Also

- [RBAC Model](./rbac.md)
- [Scan Schema](../../reference/schema/scan.md)
- [Add User How-to](../../how-to/add-user.md)
