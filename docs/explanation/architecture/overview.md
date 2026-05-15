# System Architecture Overview

**Last updated:** 2026-05-15 | **Version:** v2.23.0

High-level architecture of the Astra Security Platform.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ASTRA SECURITY PLATFORM                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────┐         ┌─────────────────────────────────────────┐  │
│  │   Next.js 16     │         │              PostgreSQL                  │  │
│  │   Frontend       │◄───────►│              Database                    │  │
│  │   (IBM Carbon)   │         │  ┌──────────────────────────────────┐   │  │
│  └──────────────────┘         │  │ Scan · Finding · Task · Job      │   │  │
│         │                     │  │ User · Config · AiCallLog        │   │  │
│         │                     │  └──────────────────────────────────┘   │  │
│         ▼                     └─────────────────────────────────────────┘  │
│  ┌──────────────────┐                                                      │
│  │   API Routes     │                                                      │
│  │   /api/v1/*      │                                                      │
│  │   (RBAC enforced)│                                                      │
│  └──────────────────┘                                                      │
│         │                                                                  │
│         ▼                                                                  │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                        SCAN WORKER                                    │  │
│  │                                                                       │  │
│  │  ┌────────────────────────────────────────────────────────────────┐  │  │
│  │  │                    JOB QUEUE                                    │  │  │
│  │  │  PENDING → RUNNING → COMPLETED / FAILED                        │  │  │
│  │  └────────────────────────────────────────────────────────────────┘  │  │
│  │                        │                                              │  │
│  │                        ▼                                              │  │
│  │  ┌────────────────────────────────────────────────────────────────┐  │  │
│  │  │                  PIPELINE DAG                                   │  │  │
│  │  │                                                                 │  │  │
│  │  │  clone → discover → git_ingest → git_diagram → tool_scan       │  │  │
│  │  │                                              ↓                  │  │  │
│  │  │                        deep_scan → cross_file → aggregate       │  │  │
│  │  │                                              ↓                  │  │  │
│  │  │                                          persist                │  │  │
│  │  │                                                                 │  │  │
│  │  └────────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    AI PROVIDER LAYER                                  │  │
│  │                                                                       │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    │  │
│  │  │   Anthropic │ │   OpenAI    │ │   Ollama    │ │   Bedrock   │    │  │
│  │  │   (Claude)  │ │   (GPT-4o)  │ │  (Llama)    │ │  (Claude)   │    │  │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘    │  │
│  │                                                                       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                   SCANNER INTEGRATIONS                                │  │
│  │                                                                       │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    │  │
│  │  │    Trivy    │ │   Semgrep   │ │  Gitleaks   │ │   Bearer    │    │  │
│  │  │   (SCA/IaC) │ │   (SAST)    │ │  (Secrets)  │ │ (Data Flow) │    │  │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘    │  │
│  │                                                                       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### Frontend (Next.js 16)

- **Framework:** Next.js 16 App Router
- **UI Library:** IBM Carbon Design System
- **State:** React Context + Browser localStorage
- **Auth:** NextAuth v5 with JWT sessions

### Backend (API Routes)

- **Runtime:** Node.js (Next.js API routes)
- **Authentication:** NextAuth v5 Credentials provider
- **Authorization:** RBAC (ADMIN, ANALYST, VIEWER)
- **Database:** PostgreSQL via Prisma ORM

### Scan Worker

- **Model:** Event-driven job processing
- **Queue:** Database-backed job queue
- **Execution:** Independent pipeline stages
- **State:** Reconstructable from completed jobs

### AI Layer

- **Interface:** Common `AIProvider` interface
- **Providers:** 7 supported backends
- **Observability:** Full logging of all AI calls
- **Thinking Mode:** Configurable reasoning depth

### Scanner Runtime

- **Integration:** Child process execution
- **Parsers:** Custom output parsers per scanner
- **Deduplication:** SHA-256 fingerprinting
- **Merge:** Combined findings from all sources

---

## Data Flow

### Scan Creation

```
User creates scan
      ↓
API validates request
      ↓
Scan record created (PENDING)
      ↓
First job enqueued (clone)
      ↓
Worker claims job
      ↓
Job executes → enqueues next job
      ↓
Pipeline completes → Scan marked COMPLETED
```

### Finding Triage

```
Finding created (OPEN)
      ↓
Analyst reviews
      ↓
Status changed (CONFIRMED / FALSE_POSITIVE)
      ↓
Assigned to developer
      ↓
Task created
      ↓
Fix implemented
      ↓
Status changed (COMPLETED)
```

### AI Chat

```
User sends message
      ↓
Provider selected (config or override)
      ↓
Prompt constructed with context
      ↓
AI call logged (AiCallLog)
      ↓
Response streamed to client
      ↓
Conversation saved (AiConversation)
```

---

## Deployment Modes

### Development

```bash
npm run dev
# Frontend + API + Worker (all in-process)
# Port: 3000
# Database: Local PostgreSQL
```

### Production

```bash
npm run build
npm start -- -p 2306
# Frontend + API (Next.js production)
# Worker: Separate process or container
# Port: 2306 (configurable)
# Database: Production PostgreSQL
```

### Containerized

```dockerfile
# Multi-stage build
# Stage 1: Build Next.js
# Stage 2: Production runtime
# Worker runs as sidecar or separate deployment
```

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **PostgreSQL over SQLite** | Scalability, concurrent writes, production readiness |
| **Event-driven worker** | Fair scheduling, no polling, efficient resource use |
| **DB-backed config** | Runtime changes without file edits or restarts |
| **Multi-provider AI** | Avoid vendor lock-in, cost optimization |
| **IBM Carbon UI** | Enterprise design system, accessibility |
| **Next.js API routes** | Unified frontend/backend, simplified deployment |
| **Prisma ORM** | Type safety, migrations, developer experience |

---

## See Also

- [Pipeline Architecture](./pipeline.md)
- [Two-Layer AI Architecture](./ai-layers.md)
- [Job Queue Fairness](./job-queue.md)
- [State Reconstruction](./state-reconstruction.md)
