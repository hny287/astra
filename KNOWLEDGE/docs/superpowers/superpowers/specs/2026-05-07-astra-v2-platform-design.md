# Astra v2 — Full Platform Design Spec

## Overview

Astra v2 transforms the security scanner from a single-user scan tool into a multi-user platform with alert triage, AI-powered assistance, GitHub integration, and team workflows. Five major feature areas, built in dependency order.

## Build Order

1. NextAuth + User Management + GitHub Profile Linking
2. Alerts + Triage Workflow
3. Better Findings Table
4. AI Chat (3 tiers: per-finding, per-scan, org-level)
5. Export Improvements

---

## Phase 1: NextAuth + User Management + GitHub Profile Linking

### Auth System

- **Provider**: NextAuth.js v5 with Credentials provider (email/password)
- **Database**: Same PostgreSQL via Prisma, new models added to existing schema
- **Session**: JWT-based sessions stored in httpOnly cookies

### New Models

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String
  passwordHash  String
  role          UserRole  @default(VIEWER)
  avatarUrl     String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  scans         Scan[]
  assignedFindings Finding[]
  alertComments AlertComment[]
  alertHistory  AlertHistory[]
  chatMessages  AiConversation[]
  githubProfile GithubProfile?

  @@index([email])
  @@index([role])
}

enum UserRole {
  ADMIN
  ANALYST
  VIEWER
}

model GithubProfile {
  id          String   @id @default(cuid())
  userId      String   @unique
  githubId    Int      @unique
  username    String
  accessToken String   // encrypted at rest
  avatarUrl   String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

### Pages

- `/auth/signin` — Email + password login form (Carbon-styled, light/dark theme aware)
- `/auth/signup` — Registration: name, email, password, confirm password
- `/settings/profile` — View/edit profile, change password, link GitHub account
- `/settings/github` — Link/unlink GitHub, see connected repos

### Middleware

- All `/api/v1/*` routes except `/api/v1/auth/*` require authentication
- JWT session includes userId and role
- `Scan.userId` links scans to users
- Role-based access:
  - **ADMIN**: full access, user management, assign alerts, view all scans
  - **ANALYST**: create scans, triage alerts, AI chat, view own + assigned scans
  - **VIEWER**: read-only, view own scans and reports

### GitHub Integration for Scan Screen

- After linking GitHub, the scan screen changes:
  - **Primary flow**: Dropdown selector showing user's GitHub repos (searchable, with org/name + description). Select a repo → Branch dropdown populates with branches from that repo → Hit "Scan"
  - **Fallback**: "Or enter URL manually" link that shows the current URL + branch input
- GitHub API calls: use stored OAuth token to fetch `/user/repos` and `/repos/{owner}/{repo}/branches`
- No more manual URL typing as the primary UX

### Scan Model Update

```prisma
model Scan {
  // ... existing fields ...
  userId       String?
  user         User?     @relation(fields: [userId], references: [id], onDelete: SetNull)
}
```

---

## Phase 2: Alerts + Triage Workflow

### Concept Rename

- UI: Findings → **Alerts** throughout the application
- DB model stays `Finding` for backwards compatibility
- New triage fields added to Finding model

### New Fields on Finding

```prisma
model Finding {
  // ... existing fields ...
  status       AlertStatus   @default(OPEN)
  priority     AlertPriority @default(MEDIUM)
  assignedToId String?
  assignedTo   User?         @relation(fields: [assignedToId], references: [id], onDelete: SetNull)

  @@index([status])
  @@index([assignedToId])
}

enum AlertStatus {
  OPEN
  CONFIRMED
  FALSE_POSITIVE
  REMEDIATED
  ACCEPTED_RISK
  IN_PROGRESS
}

enum AlertPriority {
  CRITICAL
  HIGH
  MEDIUM
  LOW
  INFO
}
```

### New Models

```prisma
model AlertComment {
  id        String   @id @default(cuid())
  findingId String
  userId    String
  text      String
  createdAt DateTime @default(now())

  finding Finding @relation(fields: [findingId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([findingId])
  @@index([findingId, createdAt])
}

model AlertHistory {
  id        String   @id @default(cuid())
  findingId String
  userId    String
  action    String   // STATUS_CHANGE, ASSIGNMENT, PRIORITY_CHANGE, COMMENT
  oldValue  String?
  newValue  String?
  createdAt DateTime @default(now())

  finding Finding @relation(fields: [findingId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([findingId])
  @@index([findingId, createdAt])
}
```

### UI: Alert Detail Panel

When a user clicks an alert row, a detail panel opens (slide-out or expand inline):

1. **Header**: Severity badge, Status badge (OPEN/CONFIRMED/FALSE_POSITIVE/etc), Priority dropdown
2. **Actions row**: 
   - **False Positive** button → sets status to FALSE_POSITIVE
   - **Confirm** button → sets status to CONFIRMED
   - **Mark Remediated** button → sets status to REMEDIATED
   - **Accept Risk** button → sets status to ACCEPTED_RISK
   - **Rescan** button → creates new scan for same repo
   - **AI Assist** button → opens per-finding chat panel
3. **Assign section**: Dropdown of team members (ADMIN/ANALYST users)
4. **Triage notes / Comments**: Threaded comments, each with user avatar, name, timestamp
5. **History timeline**: Chronological list of status changes, assignments, with who did what when
6. **Finding details**: All the existing finding data (code snippet, CWE, exploit scenario, remediation, etc.)

### Alert APIs

- `PATCH /api/v1/findings/[id]` — Update status, priority, assignedToId
- `POST /api/v1/findings/[id]/comments` — Add comment
- `GET /api/v1/findings/[id]/comments` — List comments
- `GET /api/v1/findings/[id]/history` — List triage history
- `POST /api/v1/findings/[id]/assign` — Assign to user

### Bulk Actions

- Select multiple alerts → bulk status change, bulk assign, bulk priority change
- `POST /api/v1/findings/bulk` — Accepts `{ findingIds, action, value }` for bulk operations

---

## Phase 3: Better Findings Table

### Current Problems

- Missing: exploitationScenario, exploitScore, CWE, OWASP, remediation, description
- No inline expansion — clicking a row shows minimal info
- No status/priority/assigned columns
- Cramped layout, poor information density

### New Table Design

**Column headers** (left to right):
| Severity | Status | Priority | File | Line | Title | Category | Assigned | Exploit Score |

**Expanded row** (clicking a row expands the full detail):
- **Description** — Finding description text
- **Exploitation Scenario** — Red left border accent, labeled "Proof of Concept"
- **Remediation** — Green left border accent, fix suggestion
- **Code Snippet** — With line numbers, affected lines highlighted
- **References** — Clickable CWE and OWASP badges linking to external docs
- **AI Explanation** — AI-generated explanation
- **AI Fix** — AI-generated fix code
- **Exploit Score** — Visual bar (0-10, color coded: red ≥8, yellow ≥5, green <5)
- **Confidence** — Percentage
- **Triage History** — Last 3 status changes with timestamps

**Filters**: severity, category, status, priority, assigned-to, scanner, search text
**Sort**: all columns
**Pagination**: with count badge

---

## Phase 4: AI Chat (3 Tiers)

### Model Update

```prisma
model AiConversation {
  id        String   @id @default(cuid())
  scanId    String?  // null for org-level chats
  findingId String?  // null for scan/org-level chats
  userId    String
  role      String   // "user" or "assistant"
  content   String
  createdAt DateTime @default(now())

  scan    Scan?    @relation(fields: [scanId], references: [id], onDelete: Cascade)
  finding Finding? @relation(fields: [findingId], references: [id], onDelete: Cascade)
  user    User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([scanId])
  @@index([findingId])
  @@index([scanId, findingId])
  @@index([userId])
}
```

### Adding `findingId` to Finding model

```prisma
model Finding {
  // ... existing fields ...
  chatMessages AiConversation[]
  // ... plus triage fields from Phase 2 ...
}
```

### Tier 1: Per-Finding AI Assist

- **Trigger**: "AI Assist" button on any alert row
- **Opens**: Slide-out panel on the right side of the screen (not a full page)
- **Context sent to AI**: Full finding data — title, description, severity, category, code snippet, exploitationScenario, CWE, OWASP, remediation, exploit score, confidence, file, line numbers
- **System prompt**: "You are a security analyst helping triage this vulnerability. You have full context of the finding. Help the user validate, exploit, or remediate it."
- **Use cases**: "Is this a real vulnerability?", "How would I exploit this?", "What's the priority?", "Give me a fix", "What's the impact?"
- **API**: `GET/POST /api/v1/findings/[id]/chat`
- **Storage**: AiConversation with findingId set

### Tier 2: Scan-Level AI Chat

- **Trigger**: "Chat" tab in scan detail page (replaces current Chat tab)
- **Context sent to AI**: Scan summary — total findings, severity breakdown, category breakdown, file list, business rules
- **System prompt**: "You are a security analyst discussing scan results. Answer questions about the overall scan, trends, and patterns."
- **Use cases**: "How many critical findings?", "What are the auth vulnerabilities?", "Summarize this scan", "Which files have the most issues?"
- **API**: `GET/POST /api/v1/scans/[id]/chat` (existing, enhanced)
- **Storage**: AiConversation with scanId set, findingId null

### Tier 3: Org-Level AI Chat

- **Trigger**: New "Ask AI" page or floating button in sidebar
- **Context sent to AI**: Aggregated data across all user's scans — trend over time, most vulnerable repos, category distribution, open vs remediated counts
- **System prompt**: "You are a security analyst discussing an organization's security posture across multiple scans. Answer cross-scan questions."
- **Use cases**: "Which repos have the most vulnerabilities?", "Are we improving over time?", "What's our most common vulnerability category?"
- **API**: `GET/POST /api/v1/chat` (org-level, no scan/finding context)
- **Storage**: AiConversation with scanId null and findingId null

### AI Chat UI Design

- Carbon-styled chat interface (theme-aware, works in both light and dark)
- User messages: right-aligned, primary color background, white text
- Assistant messages: left-aligned, surface-1 background, ink text
- Input bar at bottom with "Send" button
- Context badge at top: "Talking about: [Finding title]" or "Talking about: [Scan repo]" or "Organization-wide chat"
- Loading state: animated dots while AI responds

---

## Phase 5: Export Improvements

### Current Exports (keep, improve)

- **JSON**: Add triage fields (status, priority, assignedTo, comments)
- **CSV**: Add columns for status, priority, assignedEmail, explorationScenario, CWE, OWASP, remediation, exploitScore
- **SARIF**: Add triage status in properties, remediation info extensions

### New/Improved Exports

- **HTML Report**: Already exists. Make it theme-aware (follows app theme instead of hardcoded dark). Already done in current codebase.
- **Markdown Report**: Add tables for findings, severity distribution, category breakdown
- **Print to PDF**: Button on report page that triggers `window.print()` with print-optimized CSS
- **Batch Export**: Select multiple scans → export all findings as one consolidated file (admin/analyst only)

### Export API Enhancements

- `GET /api/v1/scans/[id]/export?format=json|csv|sarif|html|markdown` — existing, enhanced with triage fields
- `POST /api/v1/findings/export` — new endpoint for batch export across scans (body: `{ scanIds, format, filters }`)

---

## Phase 6: Integrations — REMOVED FROM SCOPE

Integrations (Slack, Jira, GitHub webhooks) are deferred to a future phase. The GitHub profile linking in Phase 1 is for repo/branch selection only, not for webhook notifications.

---

## Navigation Update

With all features, the sidebar/top nav becomes:

```
Astra
├── Scans          (home page, scan list)
├── Rules          (global rules management)
├── Chat           (org-level AI chat)
└── Settings
    ├── Profile     (name, email, password)
    └── GitHub      (link/unlink GitHub account)
```

Scan detail page tabs:
```
Overview | Findings (Alerts) | Files | Rules | Pipeline | Chat
```

Alert detail (slide-out from findings table row):
```
Status + Priority | Assign | Actions | AI Assist | Comments | History
```

---

## Key Architectural Decisions

1. **Findings stay as "Finding" in the DB** — UI renames to "Alert" but no DB migration of the model name
2. **AI chat uses existing Cloud Ollama provider** — no new AI infrastructure needed
3. **NextAuth v5 with Credentials** — email/password primary, GitHub OAuth secondary (for repo access only, not for login)
4. **GitHub token encryption** — AES-256 encryption stored in DB, decrypted at runtime
5. **Role-based access** — enforced at API middleware level, not just UI
6. **Triage actions write to AlertHistory** — full audit trail of who did what when
7. **Per-finding AI has full context** — sends the entire finding object to the AI, not just a summary
8. **Phased build** — each phase is independently deployable and testable
9. **Integrations deferred** — Slack, Jira, GitHub webhooks are out of scope for this phase

## File Organization

```
src/
├── app/
│   ├── (auth)/
│   │   ├── signin/page.tsx
│   │   └── signup/page.tsx
│   ├── (dashboard)/
│   │   ├── page.tsx          (scan list)
│   │   ├── scans/[id]/
│   │   │   ├── page.tsx      (scan detail)
│   │   │   └── report/page.tsx
│   │   ├── rules/page.tsx
│   │   └── chat/page.tsx     (org-level AI chat)
│   ├── settings/
│   │   ├── profile/page.tsx
│   │   └── github/page.tsx
│   └── api/v1/
│       ├── auth/[...nextauth]/route.ts
│       ├── chat/route.ts           (org-level)
│       ├── findings/
│       │   ├── [id]/
│       │   │   ├── route.ts        (PATCH status/priority/assign)
│       │   │   ├── chat/route.ts   (per-finding AI)
│       │   │   ├── comments/route.ts
│       │   │   └── history/route.ts
│       │   └── bulk/route.ts
│       ├── scans/[id]/chat/route.ts  (scan-level AI)
│       ├── user-rules/
│       └── preferences/
├── components/
│   ├── auth/
│   │   ├── SignInForm.tsx
│   │   └── SignUpForm.tsx
│   ├── alerts/
│   │   ├── AlertTable.tsx      (new findings table)
│   │   ├── AlertDetail.tsx     (slide-out panel)
│   │   ├── AlertActions.tsx     (status buttons)
│   │   ├── AlertComments.tsx
│   │   ├── AlertHistory.tsx
│   │   └── AlertAssign.tsx
│   ├── chat/
│   │   ├── ChatPanel.tsx        (reusable chat UI)
│   │   ├── ChatContextBadge.tsx
│   │   └── OrgChatPage.tsx
│   ├── scan/
│   │   ├── RepoSelector.tsx     (GitHub repo browser)
│   │   └── BranchSelector.tsx
├── lib/
│   ├── auth.ts                 (NextAuth config)
│   ├── ai.ts                   (AI chat context builders)
│   └── github.ts               (GitHub API client)
└── middleware.ts                (auth middleware)
```