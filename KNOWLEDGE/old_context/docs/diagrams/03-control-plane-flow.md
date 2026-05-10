# Astra — Control Plane Flow

## Findings Ingestion & Triage Pipeline

```mermaid
flowchart TD
    INGEST["1. Finding Ingested\nPOST /v1/ingest\nFrom Data Plane Agent"] --> DEDUP["2. Deduplicate\nSHA-256 fingerprint check\nRedis cache lookup"]
    
    DEDUP --> NEW{"Already seen?"}
    NEW -->|Yes| SKIP["Skip / update count\nExit pipeline"]
    NEW -->|No| STORE["3. Store in PostgreSQL\nfindings table"]
    
    STORE --> AI_TRIAGE["4. AI Triage\nCalculate exploitability score\nAssess business impact"]
    
    AI_TRIAGE --> POLICY["5. Policy Rule Matching\nCheck against org policies:\n  → Severity thresholds\n  → Category filters\n  → Allowlists\n  → SLA assignments"]
    
    POLICY --> ROUTE["6. Auto-Route\nBased on rules:\n  → Jira ticket created\n  → Slack alert sent\n  → PagerDuty page (CRITICAL)\n  → GitHub PR comment\n  → Email digest"]
    
    ROUTE --> NOTIFY["7. Dashboard Notification\nWebSocket push to connected clients\nReal-time update in UI"]
    
    NOTIFY --> SLA["8. SLA Timer Starts\nBased on severity:\n  CRITICAL: 4 hours\n  HIGH: 24 hours\n  MEDIUM: 72 hours\n  LOW: 7 days"]
    
    SLA --> HUMAN["9. Human Triage\nSecurity engineer reviews\nCan: confirm, assign, accept risk,\nmark false positive, request fix"]
    
    HUMAN --> STATUS{"Resolution?"}
    STATUS -->|Fixed| FIXED["Mark FIXED\nClose Jira ticket\nNotify team"]
    STATUS -->|Accepted Risk| ACCEPT["Mark ACCEPTED_RISK\nLog to audit trail\nRe-scan on next commit"]
    STATUS -->|False Positive| FP["Mark FALSE_POSITIVE\nUpdate fingerprint allowlist\nPrevent future alerts"]
    
    style INGEST fill:#0f62fe,color:#fff
    style SKIP fill:#f4f4f4,stroke:#525252
    style FIXED fill:#42be65,color:#fff
    style ACCEPT fill:#f1c21b,color:#161616
    style FP fill:#8c8c8c,color:#fff
```

---

## Control Plane API Endpoints

### Authentication
```
POST /v1/auth/login          → SSO/OAuth login
POST /v1/auth/token          → API key exchange
GET  /v1/auth/me             → Current user profile
```

### Findings
```
GET  /v1/findings            → List findings (paginated, filtered)
GET  /v1/findings/:id        → Single finding detail
POST /v1/findings/:id/triage → Update finding status
GET  /v1/findings/trends     → Trending data for dashboard
```

### Scans
```
POST /v1/scans               → Trigger new scan
GET  /v1/scans               → List scan history
GET  /v1/scans/:id           → Scan detail + findings
GET  /v1/scans/:id/status    → Real-time scan status
```

### Policies
```
GET  /v1/policies            → List org policies
POST /v1/policies            → Create new policy
PUT  /v1/policies/:id        → Update policy
DELETE /v1/policies/:id      → Delete policy
```

### Business Logic Rules
```
GET  /v1/biz-logic/rules     → List inferred rules
POST /v1/biz-logic/rules/:id/confirm → Confirm rule
POST /v1/biz-logic/rules/:id/reject  → Reject rule
```

### Integrations
```
POST /v1/integrations/jira/configure
POST /v1/integrations/slack/configure
POST /v1/integrations/pagerduty/configure
POST /v1/integrations/webhook/configure
```

---

## Control Plane Modules

```mermaid
graph LR
    subgraph CP["Control Plane — Node.js / Fastify"]
        API["API Gateway\nRate limiting, auth, routing"]
        
        subgraph MODULES["Core Modules"]
            AUTH["Auth\nSSO · SAML · OIDC\nAPI keys · RBAC"]
            FIND["Findings\nIngest · Deduplicate\nFingerprint · Trends"]
            POL["Policies\nRule routing · SLA\nThresholds · Allowlists"]
            AICP["AI Orchestration\nBiz logic store\nHuman confirmation\nModel config per org"]
            INTM["Integrations\nJira · Slack · PagerDuty\nWebhook dispatcher"]
            DAPI["Dashboard API\nREST v1 · WebSocket\nGraphQL · OpenAPI"]
        end
        
        API --> AUTH
        API --> FIND
        API --> POL
        API --> AICP
        API --> INTM
        API --> DAPI
    end
    
    subgraph STORE["Storage"]
        PG[("PostgreSQL\nFindings · Policies\nOrgs · Users · Audit")]
        RD[("Redis\nJob queues · Dedup\nWebSocket pub/sub")]
        S3[("S3 / MinIO\nArtifacts · Reports")]
    end
    
    CP --> STORE
```
