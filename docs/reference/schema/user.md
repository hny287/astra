# Database Schema: User

**Last updated:** 2026-05-15 | **Version:** v2.23.0

The `User` model represents an authenticated user of the platform.

---

## Schema Definition

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  name         String
  passwordHash String
  role         UserRole @default(VIEWER)
  avatarUrl    String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  scans             Scan[]
  assignedFindings  Finding[]
  aiCallLogs        AiCallLog[]
  tasksAssigned     Task[]      @relation("TaskAssignedTo")
  tasksCreated      Task[]      @relation("TaskCreatedBy")
  taskHistory       TaskHistory[]
  taskComments      TaskComment[]
  alertComments     AlertComment[]
  alertHistory      AlertHistory[]
  chatMessages      AiConversation[]
  githubProfile     GithubProfile?
  presets           Preset[]

  @@index([email])
  @@index([role])
}
```

---

## Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | Unique identifier (cuid) |
| `email` | String | Email address (unique) |
| `name` | String | Display name |
| `passwordHash` | String | Bcrypt password hash |
| `role` | UserRole | ADMIN, ANALYST, or VIEWER |
| `avatarUrl` | String | Profile picture URL |
| `createdAt` | DateTime | Account creation timestamp |
| `updatedAt` | DateTime | Last update timestamp |

---

## Role Enum

```prisma
enum UserRole {
  ADMIN
  ANALYST
  VIEWER
}
```

### Role Permissions

| Permission | ADMIN | ANALYST | VIEWER |
|------------|-------|---------|--------|
| Create scans | ✅ | ✅ | ❌ |
| Triage findings | ✅ | ✅ | ❌ |
| View all scans | ✅ | ❌ | ❌ |
| Manage users | ✅ | ❌ | ❌ |
| System config | ✅ | ❌ | ❌ |

---

## Relations

| Relation | Model | Description |
|----------|-------|-------------|
| `scans` | Scan | Scans created by user |
| `assignedFindings` | Finding | Findings assigned to user |
| `aiCallLogs` | AiCallLog | AI calls made by user |
| `tasksAssigned` | Task | Tasks assigned to user |
| `tasksCreated` | Task | Tasks created by user |
| `githubProfile` | GithubProfile | Linked GitHub account |
| `presets` | Preset | Configuration presets |

---

## Example Record

```json
{
  "id": "user-abc123",
  "email": "analyst@example.com",
  "name": "Security Analyst",
  "passwordHash": "$2b$10$...",
  "role": "ANALYST",
  "avatarUrl": "https://...",
  "createdAt": "2026-05-01T09:00:00Z",
  "updatedAt": "2026-05-15T10:00:00Z"
}
```

---

## Authentication

Users authenticate via NextAuth v5 with Credentials provider:

- Passwords hashed with bcrypt
- JWT sessions
- RBAC enforced on all API routes

---

## See Also

- [RBAC Model](../../explanation/security/rbac.md)
- [Add User How-to](../../how-to/add-user.md)
- [Auth API](../api/auth.md)
