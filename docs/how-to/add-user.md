# Add a New User

**Last updated:** 2026-05-15 | **Version:** v2.23.0

This guide shows you how to create user accounts in Astra with appropriate roles and permissions.

---

## Prerequisites

- ADMIN role (required to create users)

---

## Step 1: Navigate to User Management

1. Click **Settings** in the sidebar
2. Navigate to **Users** tab

---

## Step 2: Click Add User

Click the **Add User** button (top-right).

---

## Step 3: Enter User Details

Fill in the required fields:

### Email
User's email address (used for login)

### Name
Display name (can include spaces)

### Password
Temporary password (user can change after login)

### Role
Select from:
- **ADMIN** — Full access to all features
- **ANALYST** — Can create scans, triage findings, manage tasks
- **VIEWER** — Read-only access to scans and findings

---

## Step 4: Create User

Click **Create User**.

The user is now active and can sign in immediately.

---

## Step 5: Share Credentials

Securely share credentials with the user:

- Email the temporary password
- Use a password manager or secure channel
- Instruct user to change password after first login

---

## Role Permissions

### ADMIN

| Permission | Access |
|------------|--------|
| Create/Edit/Delete scans | ✅ |
| Triage findings | ✅ |
| Manage tasks | ✅ |
| Configure AI providers | ✅ |
| Manage users | ✅ |
| System configuration | ✅ |
| View all scans | ✅ |
| Export findings | ✅ |

### ANALYST

| Permission | Access |
|------------|--------|
| Create/Edit/Delete scans | ✅ (own scans) |
| Triage findings | ✅ |
| Manage tasks | ✅ |
| Configure AI providers | ❌ |
| Manage users | ❌ |
| System configuration | ❌ |
| View all scans | ❌ (own scans only) |
| Export findings | ✅ |

### VIEWER

| Permission | Access |
|------------|--------|
| Create/Edit/Delete scans | ❌ |
| Triage findings | ❌ |
| Manage tasks | ❌ |
| Configure AI providers | ❌ |
| Manage users | ❌ |
| System configuration | ❌ |
| View all scans | ❌ (own scans only) |
| Export findings | ✅ |

---

## Edit User

To modify an existing user:

1. Navigate to **Settings** → **Users**
2. Click on the user
3. Edit fields (email, name, role)
4. Click **Save**

---

## Delete User

To remove a user:

1. Navigate to **Settings** → **Users**
2. Click on the user
3. Click **Delete User**
4. Confirm deletion

**Note:** Scans and findings created by the user are preserved (ownership is set to NULL).

---

## Bulk User Operations

### Import Users (CSV)

For multiple users:

1. Prepare CSV with columns: `email`, `name`, `role`
2. Click **Import Users**
3. Upload CSV file
4. Review and confirm

### Export Users

To backup user list:

1. Click **Export Users**
2. Download CSV

---

## User Self-Service

Users can:

- Change their own password
- Update their display name
- Configure personal preferences (theme, etc.)
- Link GitHub account

---

## Troubleshooting

### Email Already Exists

**Cause:** User account already exists

**Solution:**
1. Search for the email in user list
2. Edit existing user instead
3. Or delete existing user and recreate

### Invalid Email Format

**Cause:** Email doesn't match standard format

**Solution:**
1. Use format: `user@example.com`
2. No spaces or special characters

### Cannot Create User (Permission Denied)

**Cause:** Non-ADMIN trying to create users

**Solution:**
1. Request ADMIN role
2. Ask an admin to create the user

---

## See Also

- [Configure RBAC Permissions](./configure-rbac.md)
- [Link GitHub Account](./link-github-account.md)
- [User Preferences](./user-preferences.md)
