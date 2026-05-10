# Astra Security Platform — Architecture Overview

## High-Level System Architecture

```mermaid
graph TB
    subgraph CI["CI/CD Environment — Customer Infrastructure"]
        GHA["GitHub Actions\nastra-security/scan-action@v1"]
        GLC["GitLab CI\nimage: ghcr.io/astra/scanner:latest"]
        JNK["Jenkins\nDocker agent step"]
        CLI["Local CLI\ndocker run astra/scanner"]
    end

    subgraph DP["Data Plane — Scanner Container\nPython app + scanner binaries"]
        direction TB
        ENTRY["Entrypoint\nmain.py / server.py"]
        
        subgraph SCANNERS["Traditional Scanners"]
            S1["Semgrep\nSAST · 500+ rules"]
            S2["Trivy\nCVE · IaC · Container"]
            S3["Gitleaks\nSecrets · Git history"]
            S4["Checkov\nTerraform · Helm · K8s"]
            S5["Bandit\nPython SAST"]
        end
        
        subgraph AI["AI Scanner — Two Layers"]
            AI1["Layer 1: Per-file\nOllama / Claude\nCode analysis"]
            AI2["Layer 2: Cross-file\nOllama / Claude\nBusiness logic"]
        end
        
        NORM["Normalizer\nUnified Finding Schema"]
        STORE["Storage\nPostgreSQL + S3"]
    end

    subgraph CP["Control Plane — Node.js / Fastify\nSaaS or Self-hosted"]
        API["REST API\n/v1/ingest · /v1/findings"]
        AUTH["Auth Module\nSSO · SAML · OIDC · RBAC"]
        POL["Policies Module\nRules · SLA · Thresholds"]
        INT["Integrations\nJira · Slack · PagerDuty"]
        DASH["Dashboard API\nWebSocket · GraphQL"]
    end

    subgraph UI["Dashboard — React + IBM Carbon"]
        EXE["Executive Workspace"]
        ENG["Engineering Workspace"]
        SEC["Sec Ops Workspace"]
    end

    CI -->|"mount repo\nscan token auth"| DP
    DP -->|"HTTPS POST\ngzipped JSON findings only"| CP
    CP -->|"REST + WebSocket"| UI
    CP --> INT
```

---

## Component Responsibilities

| Component | Language | Responsibility |
|-----------|----------|----------------|
| Data Plane Agent | Python | Clone repo, run scanners, AI enrichment, normalize, store |
| Control Plane API | Node.js / Fastify | Auth, findings ingestion, policies, integrations |
| Dashboard | React + Carbon | 3 role-based workspaces, scan triggers, findings display |
| PostgreSQL | SQL | Findings, policies, orgs, users, audit log |
| Redis | In-memory | Job queues, dedup cache, WebSocket pub/sub |
| S3/MinIO | Object store | Scan artifacts, raw scanner outputs, PDF reports |
| Ollama | Go / C++ | Local AI inference (optional sidecar) |

---

## Data Flow Summary

1. **Trigger**: CI pipeline or dashboard initiates scan
2. **Clone**: Data Plane clones repo (or mounts from volume)
3. **Scan**: Traditional scanners run in parallel
4. **AI**: Per-file scan → cross-file business logic analysis
5. **Normalize**: All findings mapped to Unified Finding Schema
6. **Store**: Findings saved to PostgreSQL + raw artifacts to S3
7. **Emit**: Normalized findings POSTed to Control Plane
8. **Display**: Dashboard shows findings with AI explanations and fixes
