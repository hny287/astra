# Astra Security Platform — Infrastructure Diagram

> Full system architecture: Control/Data plane separated, AI-augmented, multi-deployment, closed-source.

```mermaid
flowchart TD
    subgraph CI["CI Trigger Layer — Customer CI Environment (public wrappers only)"]
        GHA["GitHub Actions\nuses: astra-security/scan-action@v1"]
        GLC["GitLab CI\nimage: ghcr.io/astra/agent:latest"]
        JNK["Jenkins\nDockerfile agent step"]
        DCK["Any CI\ndocker run astra/agent scan"]
    end

    subgraph DP["Data Plane — astra/agent Docker Container (closed-source binary)"]
        direction TB

        subgraph PIPELINE["Scan Execution Pipeline"]
            P1["1. Context\nCollection"] --> P2["2. Language\nDetection"] --> P3["3. Parallel\nScanner Run"] --> P4["4. Finding\nNormalization"] --> P5["5. AI\nEnrichment"] --> P6["6. Biz Logic\nAnalysis"] --> P7["7. Emit to\nControl Plane"]
        end

        subgraph SCANNERS["Bundled Scanners"]
            TRV["Trivy\nCVE · IaC · Container"]
            SMP["Semgrep\nSAST · 500+ rules"]
            BER["Bearer CI\nData flows · PII · OWASP"]
            GIT["Gitleaks\nSecrets · Git history"]
            CHK["Checkov\nTerraform · Helm · K8s"]
            BDT["Bandit\nPython SAST"]
            PLG["Plugin Interface\nSnyk · CodeQL · Custom"]
        end

        subgraph AI_DP["AI Engine (runs in data plane — code never leaves)"]
            OLL["Ollama\nLlama 3 · Mistral · CodeLlama\nFully air-gapped"]
            BDR["AWS Bedrock\nLlama 3 · Mistral\nStays in customer AWS"]
            CLD["Cloud AI (opt-in)\nOpenAI · Anthropic Claude"]
        end

        subgraph SCHEMA["Unified Finding Schema"]
            SCH["id · scanner · rule_id · title\nseverity · cvss_score · category\nfile · line_start · line_end\ncode_snippet · cwe · owasp\nai_explanation · ai_fix\nexploit_score · fingerprint · raw"]
        end

        SCANNERS --> P4
        AI_DP --> P5
        P4 --> SCHEMA
        SCHEMA --> P5
    end

    subgraph CP["Control Plane — Go Modular Monolith (closed-source · SaaS / Self-hosted / Hybrid)"]
        direction TB

        subgraph MODULES["Core Modules"]
            AUTH["Auth Module\nSSO · SAML · OIDC · RBAC\nAPI keys · Scan tokens"]
            FIND["Findings Module\nIngest · Deduplicate\nFingerprint · Trends"]
            POL["Policies Module\nRule-based routing · SLA\nFail thresholds · Allowlists"]
            AICP["AI Orchestration\nBiz logic rule store\nHuman confirmation flow\nModel config per org"]
            INTM["Integrations Module\nJira · Slack · PagerDuty\nWebhook dispatcher"]
            DAPI["Dashboard API\nREST v1 · WebSocket\nGraphQL · OpenAPI"]
        end

        subgraph BIZLOGIC["Business Logic Flaw Engine — Hybrid AI + Human Loop"]
            BL1["AI scans source\n→ infers rules"] --> BL2["Rules presented\nto security team"] --> BL3["Human confirms\nedits · rejects"] --> BL4["Confirmed rules\nstored in policy DB"] --> BL5["Future scans\nenforce rules"] --> BL6["Violations flagged\nas biz logic findings"]
        end

        subgraph TRIAGE["Findings Triage & Routing Pipeline"]
            T1["Finding\ningested"] --> T2["Deduplicate\nfingerprint"] --> T3["AI triage\nexploit score"] --> T4["Policy rule\nmatching"] --> T5["Auto-route\nJira · Slack · Page"] --> T6["Dashboard\nnotification"] --> T7["SLA timer\nstarts"] --> T8["Human triage\n+ override"]
        end
    end

    subgraph DASH["Dashboard — React SPA (closed-source)"]
        direction LR
        EXE["Executive Workspace\nRisk score · Compliance\nTrends · PDF reports\nSLA breach alerts"]
        ENG["Engineering Workspace\nPer-repo findings · PR inline\nAI fix guidance · Code view\nBiz logic rule review queue"]
        SEC["Sec Ops Workspace\nAssignment · SLA tracking\nJira lifecycle · Policy builder\nScan token management · Audit log"]
    end

    subgraph INT["External Integrations"]
        SLK["Slack\nAlerts · Summaries · SLA pings"]
        JRA["Jira\nAuto-tickets · Remediation tracking"]
        PDY["PagerDuty\nCritical → on-call page"]
        GHL["GitHub · GitLab\nPR comments · Merge blocking"]
        SSO["SSO / IdP\nOkta · Azure AD · Google"]
        WBH["Webhooks\nGeneric outbound · Custom payload"]
        EML["Email\nDigest · Reports · Alerts"]
        API["REST API\nFull access · Custom integrations"]
    end

    subgraph STORE["Persistent Storage — Control Plane Only"]
        PG["PostgreSQL\nFindings · Policies · Orgs\nUsers · Biz logic rules · Audit log"]
        RD["Redis\nJob queues · Dedup cache\nWebSocket pub/sub · Sessions"]
        S3["S3 / Object Store\nScan artifacts · PDF reports\nRaw scanner outputs"]
    end

    subgraph DEPLOY["Deployment Modes"]
        SAAS["SaaS\nAstra hosts everything\nFastest onboarding"]
        SELF["Self-Hosted\nHelm chart · Docker Compose\nCustomer runs control plane"]
        HYB["Hybrid\nAstra hosts control plane\nData plane in customer CI"]
    end

    subgraph TIERS["Licensing Tiers"]
        FREE["FREE\nCLI + basic SAST"]
        PRO["PRO\nDashboard + all scanners\n+ Slack · Jira"]
        ENT["ENTERPRISE\nBiz logic AI + SSO\n+ Custom policies + On-prem"]
    end

    CI -->|"mounts repo as volume · reads ASTRA_TOKEN"| DP
    DP -->|"HTTPS POST gzip-JSON\nfindings only · no raw code · scan token auth"| CP
    CP -->|"REST + WebSocket"| DASH
    CP --> INT
    CP --> STORE
    CP --> DEPLOY
    CP --> TIERS
```

## Layer Summary

| Layer | Where it runs | Source visibility |
|---|---|---|
| CI wrapper (action.yml) | Customer CI | Public (zero logic) |
| Data plane agent | Customer CI (Docker container) | Closed-source binary |
| Control plane | Astra-hosted or self-hosted | Closed-source |
| Dashboard | Browser (React SPA) | Closed-source |
| PostgreSQL · Redis · S3 | Control plane infra only | N/A |

## Supported Languages (v1)

Python · JavaScript · TypeScript · Java · Go · Ruby · Rust · Scala · R · Terraform · Dockerfile · YAML

## AI Provider Options (per org, configurable)

| Provider | Where AI runs | Code leaves customer env? |
|---|---|---|
| Ollama (local) | Data plane | No |
| AWS Bedrock | Data plane (customer's AWS) | No |
| OpenAI / Anthropic | Cloud (opt-in only) | Yes — org must explicitly enable |
