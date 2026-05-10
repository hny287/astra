# Astra Security Platform — Complete DFD Reference
# All Data Flow Diagrams (Mermaid)
# Generated: 2026-05-09

---

## DFD-00 — Context Diagram (Level 0)
## The entire system as a single process with all external entities

```mermaid
flowchart TD
    DEV["👤 Developer\n(pushes code)"]
    SECENG["👤 Security Engineer\n(reviews findings)"]
    CISO["👤 CISO / Leadership\n(executive view)"]
    GH["⬡ GitHub / GitLab\nBitbucket / Azure DevOps"]
    JIRA["⬡ Jira"]
    SLACK["⬡ Slack"]
    PAGERDUTY["⬡ PagerDuty"]
    OLLAMA["⬡ Ollama\n(local / cloud API)"]
    OPENAI["⬡ OpenAI / Anthropic\n(opt-in cloud AI)"]
    BEDROCK["⬡ AWS Bedrock\n(in-account AI)"]

    ASTRA(["⬬ ASTRA\nSecurity Platform"])

    DEV -->|"git push / PR"| GH
    GH -->|"CI trigger / webhook"| ASTRA
    ASTRA -->|"scan token validation"| GH
    ASTRA -->|"PR comments · merge block"| GH
    ASTRA -->|"findings JSON (gzip)"| ASTRA
    ASTRA -->|"Jira tickets"| JIRA
    ASTRA -->|"alert messages"| SLACK
    ASTRA -->|"critical incidents"| PAGERDUTY
    ASTRA -->|"AI inference requests"| OLLAMA
    ASTRA -->|"AI inference (opt-in)"| OPENAI
    ASTRA -->|"AI inference (in-account)"| BEDROCK
    SECENG -->|"triage · policy config"| ASTRA
    CISO -->|"report requests"| ASTRA
    ASTRA -->|"findings · dashboards · PDF reports"| SECENG
    ASTRA -->|"risk scores · compliance"| CISO
```

---

## DFD-01 — System Architecture (Level 1)
## Control Plane / Data Plane split with all major subsystems

```mermaid
flowchart TD
    subgraph CUSTOMER["Customer CI Environment"]
        CI["CI Runner\nGitHub Actions / GitLab CI\nJenkins / Docker"]
        subgraph DP["Data Plane — astra/agent Docker Container"]
            AGENT["Scanner Orchestrator\n(Node.js binary)"]
            SCANNERS["Bundled Scanners\nTrivy · Semgrep · Gitleaks\nCheckov · Bandit · Bearer"]
            AI_LOCAL["AI Engine\nOllama / Bedrock\n(stays local)"]
            NORM["Normalizer\nUnifiedFinding schema"]
        end
    end

    subgraph CP["Control Plane (Astra SaaS / Self-hosted)"]
        AUTH["Auth Module\nSSO · SAML · OIDC · RBAC"]
        INGEST["Findings Ingest\nDedup · Fingerprint"]
        POLICY["Policy Engine\nSLA · Routing · Thresholds"]
        AIORCH["AI Orchestration\nBiz Logic Rules\nHuman Loop"]
        INTMOD["Integrations\nJira · Slack · PagerDuty\nGitHub · Webhooks"]
        DASHAPI["Dashboard API\nREST v1 · WebSocket"]
        PG[("PostgreSQL\nFindings · Policies\nOrgs · Users")]
        REDIS[("Redis\nJob Queue · Dedup Cache\nWebSocket pub/sub")]
        S3[("S3 / MinIO\nArtifacts · Reports")]
    end

    subgraph DASH["Dashboard — React SPA"]
        EXE["Executive Workspace"]
        ENG["Engineering Workspace"]
        SECOPS["Sec Ops Workspace"]
    end

    subgraph EXT["External Integrations"]
        JIRA["Jira"]
        SLACK["Slack"]
        PDY["PagerDuty"]
        GHL["GitHub / GitLab"]
    end

    CI -->|"docker run astra/agent"| AGENT
    AGENT -->|"parallel scan"| SCANNERS
    SCANNERS -->|"raw findings"| NORM
    NORM -->|"UnifiedFinding[]"| AI_LOCAL
    AI_LOCAL -->|"enriched findings"| AGENT
    AGENT -->|"HTTPS POST gzip-JSON\n(findings only, no code)"| AUTH
    AUTH -->|"validated"| INGEST
    INGEST -->|"store"| PG
    INGEST -->|"dedup fingerprint"| REDIS
    INGEST -->|"enqueue policy eval"| POLICY
    POLICY -->|"route"| INTMOD
    POLICY -->|"biz logic candidates"| AIORCH
    AIORCH -->|"confirmed rules"| PG
    INTMOD -->|"tickets"| JIRA
    INTMOD -->|"alerts"| SLACK
    INTMOD -->|"incidents"| PDY
    INTMOD -->|"PR comments"| GHL
    DASHAPI -->|"read"| PG
    DASHAPI -->|"artifacts"| S3
    DASHAPI -->|"live updates"| REDIS
    EXE & ENG & SECOPS -->|"REST / WebSocket"| DASHAPI
```

---

## DFD-02 — CI Trigger Flow (Level 2)
## How a git push becomes a scan job

```mermaid
flowchart TD
    DEV["Developer\npushes code / opens PR"]
    GH["GitHub / GitLab\nCI system"]

    subgraph WRAPPER["CI Wrapper (public, thin)"]
        GA["github-actions\nscan-action@v1"]
        GL["gitlab-ci\nastra-scan job"]
        JK["jenkins\nDockerfile agent"]
        DK["plain docker\ndocker run"]
    end

    subgraph DOCKER["astra/agent Docker container\n(runs on CI runner machine)"]
        BOOT["1. Boot & validate token\nGET /api/v1/auth/validate-token"]
        FETCH["2. Fetch org config\nscanner settings · AI config\npolicy thresholds · custom rules"]
        SCAN["3. Run scans\n(see DFD-03)"]
        EMIT["4. Emit findings\nPOST /api/v1/scans\n(gzip JSON, findings only)"]
        FALLBACK["5. Fallback on failure\nwrite to --output file\nexit code 2"]
    end

    CP["Control Plane\nAPI"]

    DEV -->|"git push / PR open"| GH
    GH -->|"trigger"| GA & GL & JK & DK
    GA & GL & JK & DK -->|"docker run\n-v repo:/repo\n-e ASTRA_TOKEN"| BOOT
    BOOT -->|"Bearer token"| CP
    CP -->|"valid / invalid"| BOOT
    BOOT -->|"token valid"| FETCH
    FETCH -->|"GET org config"| CP
    CP -->|"AstraConfig JSON"| FETCH
    FETCH -->|"config loaded"| SCAN
    SCAN -->|"findings[]"| EMIT
    EMIT -->|"HTTPS POST\nContent-Encoding: gzip"| CP
    CP -->|"201 Created\n{ scanId, ingested, new }"| EMIT
    EMIT -->|"exit 0 (clean)\nexit 1 (findings above threshold)"| GH
    EMIT -.->|"network failure\n3 retries + backoff"| FALLBACK
```

---

## DFD-03 — Scanner Execution Pipeline (Level 2)
## What happens inside the data plane during a scan

```mermaid
flowchart TD
    REPO["/repo\n(mounted volume or\ngit clone from URL)"]

    subgraph PHASE1["Phase 1 — Context Collection"]
        CTX["Detect languages\nfile extensions + shebang\ncontent heuristics"]
        META["Collect metadata\nbranch · commit SHA · PR number\nauthor · timestamp"]
        MANIFESTS["Locate manifests\npackage.json · go.mod\nrequirements.txt · Pipfile\npom.xml · Cargo.toml"]
        IACFILES["Detect IaC\nDockerfile · Terraform · Helm\nK8s manifests · CloudFormation"]
    end

    subgraph PHASE2["Phase 2 — Parallel Scanner Execution (worker pool, 4 concurrent)"]
        TRIVY["Trivy\nCVE · IaC · Container\nSCA · misconfig · secrets"]
        SEMGREP["Semgrep\nSAST · 500+ rules\nall languages"]
        GITLEAKS["Gitleaks\nsecrets · API keys\ngit history scan"]
        CHECKOV["Checkov\nTerraform · Helm · K8s\nDockerfile · CloudFormation"]
        BANDIT["Bandit\nPython SAST\nlang-specific"]
        BEARER["Bearer CI\nData flows · PII\nOWASP API"]
        PLUGIN["Plugin scanners\nSnyk · CodeQL · Custom\nvia .astra/plugins.yml"]
    end

    subgraph PHASE3["Phase 3 — Normalization"]
        NORM["Per-scanner normalizer\n→ UnifiedFinding schema\nfingerprint: SHA256(scanner+rule+file+line)"]
    end

    subgraph PHASE4["Phase 4 — AI Enrichment (in data plane)"]
        AI_ENRICH["AI Provider\nOllama / Bedrock / Cloud (opt-in)\nai_explanation · ai_fix · exploit_score"]
        BIZ_INFER["Business Logic Inference\nAI reads source → infers rules\n→ CANDIDATE BusinessLogicRule[]"]
    end

    subgraph PHASE5["Phase 5 — Emit"]
        GZIP["gzip compress\nfindings JSON"]
        POST["HTTPS POST → Control Plane\n/api/v1/scans\nAuthorization: Bearer <token>"]
    end

    REPO --> CTX & META & MANIFESTS & IACFILES
    CTX & META & MANIFESTS & IACFILES --> TRIVY & SEMGREP & GITLEAKS & CHECKOV & BANDIT & BEARER & PLUGIN
    TRIVY & SEMGREP & GITLEAKS & CHECKOV & BANDIT & BEARER & PLUGIN -->|"RawFinding[]"| NORM
    NORM -->|"UnifiedFinding[]"| AI_ENRICH
    NORM -->|"source code (local only)"| BIZ_INFER
    AI_ENRICH -->|"enriched UnifiedFinding[]"| GZIP
    BIZ_INFER -->|"BusinessLogicRule[] candidates"| GZIP
    GZIP --> POST
```

---

## DFD-04 — repo_intel Node (Level 2)
## New: system intelligence before scanning begins

```mermaid
flowchart TD
    REPO["/repo\n(local directory)"]

    subgraph INTEL["repo_intel node"]
        WALK["Walk directory tree\nmax 3 levels deep"]
        READ_KEY["Read key files\npackage.json · go.mod · requirements.txt\nREADME.md · .env.example\nmain entry points"]
        BUILD_DIGEST["Build local digest\ncompact structured representation\nof the entire codebase"]
        AI_CALL["AI call → SystemIntelReport\nprovider: config.scan.nodes.repoIntel\nmodel: deepseek-coder or claude-sonnet"]
    end

    subgraph REPORT["SystemIntelReport (stored in ScanState)"]
        SYSINFO["systemType · domain · description\ntech stack: languages · frameworks · DBs\nexternalServices: Stripe · Twilio · AWS S3"]
        AUTHINFO["authMechanism: JWT | sessions | OAuth2\nentryPoints: [routes/, server.ts]\ncriticalPaths: [PaymentService, AuthController]"]
        RISKINFO["riskProfile: HIGH | MEDIUM | LOW per category\nattackSurface: [public REST API, webhooks]\nhighValueTargets: [payments.ts, auth.ts]"]
        SCANFOCUS["scanFocus instructions\n'Focus on payment flows and JWT handling'\n'Flag any route missing auth middleware'"]
    end

    DOWNSTREAM["All downstream nodes\ndiscover · deep_scan · secrets_scan\niac_scan · cross_file"]

    REPO --> WALK
    WALK --> READ_KEY
    READ_KEY --> BUILD_DIGEST
    BUILD_DIGEST -->|"compact digest ~2K tokens"| AI_CALL
    AI_CALL --> SYSINFO & AUTHINFO & RISKINFO & SCANFOCUS
    SYSINFO & AUTHINFO & RISKINFO & SCANFOCUS -->|"injected into every\nsubsequent node prompt"| DOWNSTREAM
```

---

## DFD-05 — LangGraph Scan Graph (Level 2)
## The nonlinear DAG pipeline with parallel tracks

```mermaid
flowchart TD
    START(["START"])
    CLONE["clone\ngit clone + PAT decrypt\nresolve commitSHA"]
    REPO_INTEL["repo_intel\nSystemIntelReport\nbuild codebase context"]
    DISCOVER["discover\nAI-guided file prioritization\nP0→P4 tiers + token budget"]

    subgraph FORK["PARALLEL FORK — conditional on SystemIntelReport"]
        DEEP["deep_scan\nper-file AI analysis\nbatched · concurrent\nfindings + FileSummary[]"]
        SECRETS["secrets_scan\nGitleaks · TruffleHog\ngit history + current\n(fast, no AI)"]
        IAC["iac_scan\nCheckov · Trivy IaC\nTerraform · Helm · K8s\n(conditional: if IaC files found)"]
    end

    PERSIST_BATCH["persist_findings\n(streaming — per batch\nnot at end)\nwrite to PostgreSQL + S3"]

    subgraph XFILE["Cross-File Analysis"]
        CLUSTER["cluster_summaries\ngroup FileSummary[] by domain\nauth cluster · payments cluster\nAPI cluster · config cluster"]
        CROSS_PER["cross_file_per_cluster\nAI reasons per domain cluster\nfocused context per call"]
        CROSS_GLOBAL["cross_file_global\nreason across cluster summaries\nbusiness logic · data flows\nmissing auth middleware"]
    end

    TRIAGE["triage\ncount CRITICAL findings\nconditional routing"]
    ENRICH["enrich_critical\n(conditional)\ndeep dive on CRITICAL findings\nre-read specific files\nconfirm · expand · dismiss"]
    BIZ_RULES["persist_business_rules\nstore BusinessLogicRule[]\nas CANDIDATE status\nfor human review queue"]
    FINALIZE["finalize\nmark scan COMPLETED\ncalculate durationSeconds\nemit SSE complete event\nnotify integrations"]
    END_NODE(["END"])

    START --> CLONE
    CLONE --> REPO_INTEL
    REPO_INTEL --> DISCOVER
    DISCOVER -->|"has_iac → iac_scan"| IAC
    DISCOVER -->|"always"| DEEP
    DISCOVER -->|"has_secrets_risk"| SECRETS
    DEEP -->|"per batch"| PERSIST_BATCH
    SECRETS -->|"findings"| PERSIST_BATCH
    IAC -->|"findings"| PERSIST_BATCH
    DEEP -->|"FileSummary[]"| CLUSTER
    SECRETS & IAC -->|"join"| CLUSTER
    CLUSTER --> CROSS_PER
    CROSS_PER --> CROSS_GLOBAL
    CROSS_GLOBAL --> TRIAGE
    TRIAGE -->|"CRITICAL > 0"| ENRICH
    TRIAGE -->|"always"| BIZ_RULES
    ENRICH --> BIZ_RULES
    BIZ_RULES --> FINALIZE
    FINALIZE --> END_NODE
```

---

## DFD-06 — Job Queue Runtime (Level 2)
## How the PostgreSQL worker actually executes nodes

```mermaid
flowchart TD
    API["POST /api/v1/scans\n{ repoUrl, branch, config }"]

    subgraph INIT["Scan Initialization"]
        AUTH_CHECK["requireAuth()\nverify JWT session"]
        LOAD_CFG["loadConfigFromDb()\nmergeNodeOverrides()"]
        CREATE_SCAN["prisma.scan.create()\nstatus: PENDING"]
        ENQUEUE["enqueuePipeline(scanId)\ncreate Job(PENDING, node='clone')"]
    end

    subgraph WORKER["Worker Loop (processNextJob)"]
        CLAIM["claimNextJob()\npick oldest PENDING Job\nset status → RUNNING"]
        RECONSTRUCT["reconstructState(scanId)\nread all COMPLETED Job rows\nmerge outputJson in order"]
        EXEC["nodeFn(state)\nrun the node function\nreturn Partial<ScanState>"]
        COMPLETE["markJobComplete(jobId, outputJson)\nstore partial state in Job.outputJson"]
        NEXT_JOB["enqueueNextJob(scanId, currentNode)\ncreate Job(PENDING, next node)\nrespect depends_on[] for parallel tracks"]
        RECURSE["processNextJob() → recurse"]
    end

    subgraph ERROR["Error Handling"]
        FAIL_JOB["markJobFailed(jobId, error)"]
        FAIL_SCAN["markScanFailed(scanId)"]
        CLEANUP["cleanupStuckJobs()\nany RUNNING > 10 min → reset PENDING"]
        RESUME["POST /api/v1/scans/:id/resume\nresume from next uncompleted node"]
        RERUN["POST /api/v1/scans/:id/rerun-node\nre-run specific node"]
    end

    PG[("PostgreSQL\nJob table\nScan table")]

    API --> AUTH_CHECK
    AUTH_CHECK --> LOAD_CFG
    LOAD_CFG --> CREATE_SCAN
    CREATE_SCAN --> ENQUEUE
    ENQUEUE -->|"write Job row"| PG
    PG -->|"poll PENDING jobs"| CLAIM
    CLAIM --> RECONSTRUCT
    RECONSTRUCT -->|"read completed Job rows"| PG
    RECONSTRUCT --> EXEC
    EXEC --> COMPLETE
    COMPLETE -->|"write outputJson"| PG
    COMPLETE --> NEXT_JOB
    NEXT_JOB -->|"write new Job row"| PG
    NEXT_JOB --> RECURSE
    RECURSE --> CLAIM
    EXEC -.->|"throws"| FAIL_JOB
    FAIL_JOB --> FAIL_SCAN
    FAIL_SCAN -.-> RESUME
    RESUME -.-> ENQUEUE
    CLEANUP -->|"periodic"| PG
    RERUN --> ENQUEUE
```

---

## DFD-07 — Control Plane Ingest Pipeline (Level 2)
## What happens when findings arrive at the control plane

```mermaid
flowchart TD
    AGENT["Data Plane\nastra/agent\nHTTPS POST /api/v1/scans"]

    subgraph INGEST["Findings Ingest Module"]
        VALIDATE["Validate scan token\ncheck org · repo ownership\nrate limit check"]
        DECOMPRESS["Decompress gzip\nparse UnifiedFinding[]"]
        DEDUP["Deduplicate\nSHA-256 fingerprint lookup\n(fingerprint + org_id)"]
        UPSERT_NEW["INSERT new finding\nstatus: NEW\nfirst_seen: now()"]
        UPSERT_EXIST["UPDATE existing finding\nlast_seen: now()\noccurrence_count++"]
        CREATE_SCAN["CREATE scan record\nbranch · commit · scanners_run\nduration · finding_counts"]
    end

    subgraph POLICY["Policy Engine"]
        MATCH["Match policy rules\nconditions: severity · category\nscanner · file_pattern · language"]
        SLA["Set SLA deadline\nCRITICAL: 24h · HIGH: 72h\nMEDIUM: 14d · LOW: 30d"]
        ROUTE["Route actions\ncreate_jira · notify_slack\npage_pagerduty · webhook\nfail_scan"]
    end

    subgraph BIZLOGIC["Business Logic Engine"]
        BIZ_RECV["Receive CANDIDATE rules\nfrom scan payload"]
        BIZ_STORE["Store with status: CANDIDATE\nin biz_logic_rules table"]
        BIZ_QUEUE["Add to human review queue\nSec Ops workspace notification"]
    end

    subgraph STORAGE["Storage"]
        PG[("PostgreSQL\nfindings · scans\nbiz_logic_rules")]
        REDIS[("Redis\ndedup cache\nSSE pub/sub")]
        S3[("S3 / MinIO\nraw scanner artifacts\ngzip payload archive")]
    end

    subgraph INTEGRATIONS["Integrations"]
        JIRA["Jira\ncreate issue\nmap severity → priority"]
        SLACK["Slack\nBlock message\nseverity badge + link"]
        PDY["PagerDuty\nCRITICAL → incident"]
        GHL["GitHub / GitLab\nPR comment\ncommit status check"]
        WBH["Webhook\nHMAC-SHA256 signed\ncustom payload"]
    end

    DASHBOARD["Dashboard\nSSE live update\nfinding appears instantly"]

    AGENT --> VALIDATE
    VALIDATE --> DECOMPRESS
    DECOMPRESS --> DEDUP
    DEDUP -->|"new"| UPSERT_NEW
    DEDUP -->|"existing"| UPSERT_EXIST
    UPSERT_NEW & UPSERT_EXIST --> CREATE_SCAN
    CREATE_SCAN -->|"write"| PG
    CREATE_SCAN -->|"cache fingerprint"| REDIS
    CREATE_SCAN -->|"archive payload"| S3
    CREATE_SCAN --> MATCH
    MATCH --> SLA
    SLA --> ROUTE
    ROUTE --> JIRA & SLACK & PDY & GHL & WBH
    ROUTE -->|"SSE event"| REDIS
    REDIS -->|"pub/sub"| DASHBOARD
    DECOMPRESS -->|"biz logic candidates"| BIZ_RECV
    BIZ_RECV --> BIZ_STORE
    BIZ_STORE -->|"write"| PG
    BIZ_STORE --> BIZ_QUEUE
```

---

## DFD-08 — Authentication & Authorization Flow (Level 2)
## All auth paths: user login, scan token, SSO

```mermaid
flowchart TD
    subgraph ACTORS["Actors"]
        USER["User\n(browser)"]
        AGENT["astra/agent\n(scan token)"]
        ADMIN["Org Admin\n(token management)"]
    end

    subgraph AUTH["Auth Module"]
        subgraph USER_AUTH["User Authentication"]
            LOGIN["POST /api/v1/auth/login\nemail + password"]
            BCRYPT["bcrypt.compare()\npassword verification"]
            SESSION["Create session\nJWT (HS256)\n24h expiry"]
            SSO["SSO / SAML / OIDC\nOkta · Azure AD · Google\nSP-initiated flow"]
        end

        subgraph TOKEN_AUTH["Scan Token Authentication"]
            VALIDATE_TOK["GET /api/v1/auth/validate-token\nBearer <scan-token>"]
            HASH_CHECK["SHA-256 hash lookup\nin scan_tokens table"]
            ORG_FETCH["Fetch org config\nenabled scanners · AI config\npolicy thresholds"]
        end

        subgraph RBAC["RBAC — Role-Based Access Control"]
            ROLES["Roles:\nVIEWER · ENGINEER\nSEC_OPS · ADMIN"]
            MIDDLEWARE["requireSession()\nrequireScanToken()\nrequireRole(role)"]
        end
    end

    subgraph TOKEN_MGMT["Token Management"]
        CREATE_TOK["POST /api/v1/tokens\ncreate scan token\nscope: org · repo"]
        ROTATE["PUT /api/v1/tokens/:id/rotate\nrevoke old · issue new"]
        REVOKE["DELETE /api/v1/tokens/:id\nimmediate revocation"]
        AUDIT["Audit log\nevery token event\nwho · what · when"]
    end

    PG[("PostgreSQL\nusers · sessions\nscan_tokens")]

    USER -->|"credentials"| LOGIN
    LOGIN --> BCRYPT
    BCRYPT -->|"valid"| SESSION
    SESSION -->|"set-cookie: session_id"| USER
    USER -->|"SSO redirect"| SSO
    SSO -->|"SAML assertion / OIDC token"| SESSION
    AGENT -->|"Authorization: Bearer"| VALIDATE_TOK
    VALIDATE_TOK --> HASH_CHECK
    HASH_CHECK -->|"found"| ORG_FETCH
    ORG_FETCH -->|"AstraConfig"| AGENT
    HASH_CHECK -->|"lookup"| PG
    SESSION -->|"write"| PG
    LOGIN -->|"read"| PG
    ADMIN --> CREATE_TOK & ROTATE & REVOKE
    CREATE_TOK & ROTATE & REVOKE -->|"write"| PG
    CREATE_TOK & ROTATE & REVOKE --> AUDIT
    MIDDLEWARE -->|"every protected route"| ROLES
```

---

## DFD-09 — AI Provider Flow (Level 2)
## How AI calls are made, instrumented, and retried

```mermaid
flowchart TD
    NODE["Pipeline Node\n(discover · deep_scan · cross_file)"]

    subgraph FACTORY["Provider Factory\nsrc/providers/factory.ts"]
        RESOLVE["createProviderForNode(nodeConfig)\nread provider name + model\nfrom state.config.scan.nodes[node]"]
        INSTANTIATE["Instantiate AIProvider\nOllama | OpenAI | Anthropic | Gemini\nAWS Bedrock | Azure (stub)"]
    end

    subgraph INSTRUMENTED["instrumentedSend()\nsrc/lib/ai-instrumentation.ts"]
        START_TIMER["start = Date.now()"]
        SEND["provider.send(request)\n{ system, prompt, maxOutputTokens }"]
        LOG["prisma.aiCallLog.create()\nprovider · model · tokens\ndurationMs · status\nfull request + response JSON"]
    end

    subgraph PROVIDERS["AI Provider Implementations"]
        OLLAMA["Ollama\nHTTP fetch → /api/generate\nOLLAMA_HOST or cloud API\nOLLAMA_API_KEY"]
        OPENAI["OpenAI\nnpm: openai\nOPENAI_API_KEY\ngpt-4o · gpt-4.1"]
        ANTHROPIC["Anthropic\nnpm: @anthropic-ai/sdk\nANTHROPIC_API_KEY\nclaude-sonnet-4"]
        GEMINI["Google Gemini\nnpm: @google/generative-ai\nGEMINI_API_KEY\ngemini-2.5-pro"]
        BEDROCK["AWS Bedrock\nAWS SDK (stub)\nnot yet implemented"]
    end

    subgraph RETRY["Retry Logic"]
        ATTEMPT["attempt (1..maxRetries)"]
        BACKOFF["exponential backoff\nretryBackoffMs * 2^attempt"]
        EMPTY_CHECK["detect empty response\nretry on empty"]
        SKIP["skip file on exhaustion\nappend to state.errors[]"]
    end

    subgraph TOKEN["Token Management"]
        COUNT["estimateTokens(text)\n~4 chars per token"]
        BUDGET["token budget\ninputLimit - systemTokens - outputLimit"]
        CHUNK["chunk large files\nby function/class boundaries\nadd file header context"]
    end

    NODE --> RESOLVE
    RESOLVE --> INSTANTIATE
    INSTANTIATE --> START_TIMER
    START_TIMER --> SEND
    SEND --> OLLAMA & OPENAI & ANTHROPIC & GEMINI & BEDROCK
    SEND --> LOG
    LOG -->|"write"| DB[("PostgreSQL\nai_call_logs")]
    OLLAMA & OPENAI & ANTHROPIC & GEMINI -->|"AIResponse\n{ text, inputTokens, outputTokens, durationMs }"| NODE
    SEND -.->|"error / empty"| ATTEMPT
    ATTEMPT --> BACKOFF
    BACKOFF --> SEND
    ATTEMPT -.->|"exhausted"| SKIP
    NODE --> COUNT
    COUNT --> BUDGET
    BUDGET --> CHUNK
    CHUNK -->|"sized chunks"| SEND
```

---

## DFD-10 — Business Logic Flaw Engine (Level 2)
## Full lifecycle: inference → human review → enforcement

```mermaid
flowchart TD
    subgraph INFER["Phase 1 — AI Inference (in data plane)"]
        SRC["Source code\n(in repo)"]
        AI_READ["AI reads source\nbuilds FileSummary[]\ncodebase_map"]
        RULE_INFER["cross_file AI pass\ninfers business rules\nfrom patterns observed:\n'All /charge routes must check auth'\n'Amounts must come from DB, not request'"]
        CANDIDATES["BusinessLogicRule[]\nCANDIDATE status\nconfidence: 0.0–1.0\nevidenceFiles: [...]"]
    end

    subgraph TRANSIT["Phase 2 — Transmission"]
        EMIT["Emitted in scan payload\nbizLogicCandidates[]\nalongside findings[]"]
        RECV["Control plane receives\nstores in biz_logic_rules table\nstatus: CANDIDATE"]
    end

    subgraph REVIEW["Phase 3 — Human Review (Sec Ops Workspace)"]
        QUEUE["Rule Review Queue\nSec Ops workspace\nprioritized by confidence"]
        CONFIRM["Security team\nConfirm rule as-is"]
        EDIT["Edit rule text\nclarify / tighten scope"]
        REJECT["Reject rule\n(false positive)"]
        STORE["Store CONFIRMED rules\nin policy database\nwith org_id scope"]
    end

    subgraph ENFORCE["Phase 4 — Enforcement (future scans)"]
        DIST["Confirmed rules distributed\nto data plane via\ntoken validation response"]
        SCAN_ENFORCE["Future scans include\nconfirmed rules in\nAI system prompt"]
        VIOLATE["Rule violation → finding\nscanner: 'business-logic'\ncategory: BUSINESS_LOGIC\nseverity: from rule definition"]
        TRACK["Violation history tracked\nper rule · per file · per scan"]
    end

    SRC --> AI_READ
    AI_READ --> RULE_INFER
    RULE_INFER --> CANDIDATES
    CANDIDATES --> EMIT
    EMIT --> RECV
    RECV --> QUEUE
    QUEUE --> CONFIRM & EDIT & REJECT
    CONFIRM & EDIT --> STORE
    STORE --> DIST
    DIST --> SCAN_ENFORCE
    SCAN_ENFORCE --> VIOLATE
    VIOLATE --> TRACK
    REJECT -->|"status: REJECTED"| PG[("PostgreSQL")]
    STORE -->|"status: CONFIRMED"| PG
    TRACK -->|"write"| PG
```

---

## DFD-11 — Finding Triage Pipeline (Level 2)
## From ingest through routing to human resolution

```mermaid
flowchart TD
    INGEST["Finding ingested\nfrom scan payload"]

    subgraph AUTO["Automated Triage"]
        DEDUP["Deduplicate\nSHA-256 fingerprint\nfound? → update last_seen\nnot found? → INSERT NEW"]
        EXPLOIT_SCORE["AI exploit scoring\n0.0–10.0\nreachability · auth required\nknown exploit patterns"]
        POLICY_MATCH["Policy rule matching\nconditions:\nseverity · category · scanner\nlanguage · file_pattern"]
        SLA_SET["SLA timer starts\nCRITICAL: 24h\nHIGH: 72h\nMEDIUM: 14d · LOW: 30d"]
        AUTO_ROUTE["Auto-route actions\ncreate Jira ticket\nSlack alert\nPagerDuty page\nGitHub PR comment"]
    end

    subgraph HUMAN["Human Triage (Engineering / Sec Ops Workspace)"]
        ASSIGN["Assign to engineer\nvia dashboard or Jira"]
        REVIEW["Engineer reviews\ncode snippet · AI explanation\nai_fix suggestion"]
        TRIAGE_ACTION["Triage decision"]
        FIX["Mark FIXED\nclose Jira · resolve PagerDuty\nSLA satisfied"]
        FALSE_POS["Mark FALSE_POSITIVE\nwith justification\nfingerprint allowlisted"]
        ACCEPT_RISK["Mark ACCEPTED_RISK\nwith justification\nbusiness decision recorded"]
        SUPPRESS["Suppress / Override\nallowlist rule\nfor future scans"]
    end

    subgraph SLA_TRACK["SLA Monitoring (background jobs)"]
        CHECK["SLA checker\nruns every 15 min"]
        BREACH["SLA breached\nnotify assignee + admin\nescalate PagerDuty"]
        EXEC_REPORT["Executive dashboard\nSLA breach count\nremediation velocity"]
    end

    INGEST --> DEDUP
    DEDUP --> EXPLOIT_SCORE
    EXPLOIT_SCORE --> POLICY_MATCH
    POLICY_MATCH --> SLA_SET
    SLA_SET --> AUTO_ROUTE
    AUTO_ROUTE --> ASSIGN
    ASSIGN --> REVIEW
    REVIEW --> TRIAGE_ACTION
    TRIAGE_ACTION --> FIX & FALSE_POS & ACCEPT_RISK & SUPPRESS
    SLA_SET --> CHECK
    CHECK -->|"deadline exceeded"| BREACH
    BREACH --> EXEC_REPORT
    FIX -->|"update state"| PG[("PostgreSQL")]
    FALSE_POS & ACCEPT_RISK & SUPPRESS -->|"update state"| PG
```

---

## DFD-12 — Data Storage Architecture (Level 2)
## What lives where and why

```mermaid
flowchart TD
    subgraph POSTGRES["PostgreSQL 16 — Source of Truth"]
        ORGS["orgs\nid · name · slug · plan\nai_provider_config (encrypted)\nsso_config · seat_count"]
        USERS["users\nid · org_id · email\npassword_hash · role\nlast_login"]
        REPOS["repos\nid · org_id · name · provider\nprovider_repo_id · default_branch\nlanguages · risk_score"]
        SCAN_TOKENS["scan_tokens\nid · org_id · repo_id\nhash (SHA-256) · name\nlast_used · revoked_at"]
        SCANS["scans\nid · org_id · repo_id\nbranch · commit_sha · pr_number\nstatus · duration_seconds\nscanner_run[] · finding_counts{}"]
        FINDINGS["findings\nid · fingerprint · org_id\nscanner · rule_id · title\nseverity · category · file\nline_start · line_end · code_snippet\ncwe[] · owasp[] · state\nai_explanation · ai_fix · exploit_score\nfirst_seen · last_seen · occurrence_count"]
        POLICIES["policies\nid · org_id · repo_id\nname · conditions{} · actions{}\npriority · enabled"]
        BIZ_RULES["biz_logic_rules\nid · org_id · rule_text\nconfidence · evidence_files[]\nstatus: CANDIDATE|CONFIRMED|REJECTED"]
        JOBS["jobs\nid · scan_id · node · status\ninput_json · output_json\ncreated_at · updated_at"]
        AI_LOGS["ai_call_logs\nid · scan_id · node_id\nprovider · model\ninput_tokens · output_tokens · thinking_tokens\nduration_ms · status\nrequest_json · response_json"]
        AUDIT["audit_log\nid · org_id · user_id\naction · resource_type · resource_id\nbefore{} · after{} · timestamp"]
    end

    subgraph REDIS["Redis 7 — Ephemeral & Real-time"]
        DEDUP_CACHE["Dedup cache\nfingerprint → finding_id\nTTL: 30 days"]
        JOB_QUEUE["Job queue\nBull/BullMQ queues\npending jobs"]
        SSE_PUBSUB["SSE pub/sub\nlive finding notifications\nscan progress updates"]
        SESSIONS["Session store\nJWT session data\nTTL: 24h"]
        RATE_LIMIT["Rate limit counters\nper IP · per token\nTTL: 60s"]
    end

    subgraph S3["S3 / MinIO — Large Objects"]
        ARTIFACTS["Scan artifacts\nraw scanner output JSON\nper scanner per scan"]
        PAYLOADS["Scan payloads\noriginal gzip POST body\ncompressed · 90-day retention"]
        REPORTS["PDF reports\nexecutive reports\ngenerated on demand"]
        SBOM["SBOM exports\nSPDX · CycloneDX\nper repo per scan"]
    end

    FINDINGS -->|"fingerprint lookup"| DEDUP_CACHE
    JOBS -->|"queue pending"| JOB_QUEUE
    FINDINGS -->|"new finding event"| SSE_PUBSUB
    USERS -->|"session data"| SESSIONS
```

---

## DFD-13 — Dashboard Data Flow (Level 2)
## How the React SPA gets and displays data

```mermaid
flowchart TD
    subgraph SPA["React SPA (Next.js 15 App Router)"]
        subgraph EXE["Executive Workspace"]
            RISK_SCORE["Org Risk Score\n0–100 composite\ntrend vs 30 days ago"]
            COMPLIANCE["Compliance Posture\nOWASP Top 10\nCWE Top 25 · SOC 2"]
            TREND_CHART["Finding Trend Chart\nCRITICAL/HIGH/MEDIUM/LOW\nstacked area · 90 days"]
            TOP_REPOS["Top Vulnerable Repos\nrisk score · critical count\nlast scan"]
            SLA_SUMMARY["SLA Breach Summary\ncount by severity\nlink → Sec Ops"]
            VEL["Remediation Velocity\navg time to fix\nby severity · 30 days"]
            PDF_REPORT["Executive PDF Report\ngenerate on demand\nor scheduled email"]
        end

        subgraph ENG["Engineering Workspace"]
            REPO_FINDER["Repo Finder\nsearchable · risk badges"]
            FINDING_LIST["Finding List\nfilter: severity · category\nscanner · state · file · date"]
            FINDING_DETAIL["Finding Detail Panel\ncode snippet · AI explanation\nai_fix · CWE · OWASP\nhistory · PR links"]
            PR_RESULTS["PR Scan Results\nnew vs existing vs resolved\nper PR delta"]
            SUPPRESS_UI["Suppress / Override\nFALSE_POSITIVE\nACCEPTED_RISK + justification"]
        end

        subgraph SECOPS["Sec Ops Workspace"]
            ASSIGN_UI["Finding Assignment\nassign to team members"]
            SLA_TRACKER["SLA Tracker\nsorted by deadline\nbreach countdown timers"]
            JIRA_VIEW["Jira Ticket View\nbi-directional status sync"]
            POLICY_BUILDER["Policy Rule Builder\nno-code condition + action UI"]
            BIZ_QUEUE["Business Logic Rule Queue\nConfirm / Edit / Reject\nCANDIDATE rules"]
            TOKEN_MGR["Scan Token Manager\ncreate · rotate · revoke"]
            AUDIT_LOG["Audit Log\nall user actions\nwho · what · when"]
        end
    end

    subgraph API["Dashboard API"]
        REST["REST v1\n/api/v1/*"]
        WS["WebSocket\nlive updates"]
        GQL["GraphQL (Enterprise)\ncustom queries"]
    end

    subgraph PUSH["Real-time Push"]
        SSE["SSE stream\n/api/v1/scans/:id/progress"]
        PUBSUB["Redis pub/sub\nfinding events"]
    end

    PG[("PostgreSQL")]
    S3[("S3")]

    RISK_SCORE & COMPLIANCE & TREND_CHART & TOP_REPOS & SLA_SUMMARY & VEL -->|"GET"| REST
    PDF_REPORT -->|"POST"| REST
    REPO_FINDER & FINDING_LIST & FINDING_DETAIL & PR_RESULTS -->|"GET"| REST
    SUPPRESS_UI -->|"PATCH"| REST
    ASSIGN_UI & SLA_TRACKER & JIRA_VIEW & TOKEN_MGR & AUDIT_LOG -->|"GET/POST/PATCH"| REST
    POLICY_BUILDER -->|"GET/POST/PUT"| REST
    BIZ_QUEUE -->|"GET/POST (confirm/reject)"| REST
    REST -->|"query"| PG
    REST -->|"read artifacts"| S3
    WS & SSE -->|"subscribe"| PUBSUB
    PUBSUB -->|"publish"| WS & SSE
    FINDING_LIST & TREND_CHART -->|"WebSocket"| WS
```

---

## DFD-14 — Integrations Flow (Level 2)
## How findings route to external systems

```mermaid
flowchart TD
    POLICY_ENGINE["Policy Engine\nmatched rule action"]

    subgraph INT_MODULE["Integrations Module"]
        DISPATCHER["Event Dispatcher\nIntegrationEvent → route"]
        JIRA_INT["Jira Integration\nPOST /rest/api/3/issue\nseverity → priority map\nCRITICAL→P1 HIGH→P2\nstore jira_issue_key on finding"]
        SLACK_INT["Slack Integration\nBlocks API POST\nbadge · title · file · line\nAI explanation excerpt\ndashboard link"]
        PDY_INT["PagerDuty Integration\nEvents API v2\nCRITICAL only\nauto-resolve on FIXED"]
        GHL_INT["GitHub/GitLab\nPR inline comment\ncommit status check\npass/fail threshold"]
        WBH_INT["Webhook\nHTTPS POST to customer URL\nHMAC-SHA256 signature\nretry: 3× exponential backoff"]
        EMAIL_INT["Email\nweekly digest\nSLA breach notifications\nPDF report delivery"]
    end

    subgraph JIRA_SYNC["Jira Bi-directional Sync"]
        JIRA_STATUS["Jira issue status → finding state\nDone → FIXED\nIn Progress → TRIAGED"]
        WEBHOOK_RECV["Receive Jira webhook\nstatus change events"]
    end

    subgraph GITHUB_SYNC["GitHub/GitLab Actions"]
        PR_COMMENT["POST inline PR comment\nfile · line · finding title\nCWE · severity · ai_fix link"]
        COMMIT_STATUS["Update commit status\npass: no findings above threshold\nfail: findings found → CI blocked"]
        MERGE_BLOCK["Merge blocking\nrequired status check\n'astra/security-scan'"]
    end

    JIRA["Jira Cloud / Server"]
    SLACK["Slack\nAPI"]
    PAGERDUTY["PagerDuty\nEvents API"]
    GITHUB["GitHub / GitLab\nREST API"]
    CUSTOMER["Customer\nWebhook URL"]
    EMAIL_SVC["Email Service\nSES / SendGrid"]

    POLICY_ENGINE --> DISPATCHER
    DISPATCHER --> JIRA_INT & SLACK_INT & PDY_INT & GHL_INT & WBH_INT & EMAIL_INT
    JIRA_INT -->|"create issue"| JIRA
    JIRA -->|"issue key"| JIRA_INT
    JIRA -->|"status change webhook"| WEBHOOK_RECV
    WEBHOOK_RECV --> JIRA_STATUS
    SLACK_INT -->|"Block message"| SLACK
    PDY_INT -->|"trigger incident"| PAGERDUTY
    GHL_INT --> PR_COMMENT & COMMIT_STATUS
    PR_COMMENT & COMMIT_STATUS -->|"API calls"| GITHUB
    COMMIT_STATUS --> MERGE_BLOCK
    WBH_INT -->|"signed POST"| CUSTOMER
    EMAIL_INT -->|"SMTP/API"| EMAIL_SVC
```

---

## DFD-15 — Deployment Architecture (Level 2)
## How Astra is packaged and deployed in all three modes

```mermaid
flowchart TD
    subgraph SAAS["Mode 1 — SaaS (Astra-hosted)"]
        SAAS_CP["Control Plane\nastra.security\n(managed by Astra)"]
        SAAS_PG["PostgreSQL (managed)"]
        SAAS_REDIS["Redis (managed)"]
        SAAS_S3["S3 (managed)"]
        SAAS_DP["astra/agent\nruns in customer CI\n→ calls api.astra.security"]
    end

    subgraph SELF_HOSTED["Mode 2 — Self-Hosted (Helm / Docker Compose)"]
        subgraph HELM["Helm Chart"]
            H_CP["control-plane\nDeployment"]
            H_PG["postgres\nStatefulSet or external"]
            H_REDIS["redis\nStatefulSet or external"]
            H_S3["minio\nor external S3"]
            H_ING["Ingress\nnginx / traefik"]
            H_HPA["HPA\nhorizontal pod autoscaler"]
        end
        subgraph COMPOSE["Docker Compose"]
            C_APP["astra\n:8080"]
            C_PG["postgres:16-alpine"]
            C_REDIS["redis:7-alpine"]
            C_MINIO["minio"]
        end
        SELF_DP["astra/agent\nruns in customer CI\n→ calls internal control plane URL"]
    end

    subgraph HYBRID["Mode 3 — Hybrid"]
        HYB_CP["Control Plane\n(Astra-hosted)"]
        HYB_DP["astra/agent\nruns in customer CI\nall scanning local\n→ POST findings to Astra"]
    end

    subgraph IMAGE["Container Distribution"]
        AGENT_IMG["ghcr.io/astra-security/agent:1.x.x\nAll scanners bundled\nAI engine bundled\nClosed-source binary\npull with license key"]
        CP_IMG["ghcr.io/astra-security/control-plane:1.x.x\nClosed-source\npull with license key"]
    end

    subgraph CI_WRAPPERS["CI Wrappers (public, thin)"]
        GHA_W["github-actions\nastra-security/scan-action@v1\naction.yml → runs agent image"]
        GLC_W["gitlab-ci\nimage: agent:latest\nastra scan --token $ASTRA_TOKEN"]
        JNK_W["jenkins\ndocker { image 'agent:latest' }\nsh 'astra scan --token...'"]
        DCK_W["plain docker\ndocker run -v repo:/repo\n-e ASTRA_TOKEN agent:latest"]
    end

    AGENT_IMG --> SAAS_DP & SELF_DP & HYB_DP
    CP_IMG --> H_CP & C_APP
    GHA_W & GLC_W & JNK_W & DCK_W --> SAAS_DP & SELF_DP & HYB_DP
    SAAS_DP -->|"HTTPS POST findings"| SAAS_CP
    SELF_DP -->|"HTTPS POST findings"| H_CP & C_APP
    HYB_DP -->|"HTTPS POST findings"| HYB_CP
    H_CP --> H_PG & H_REDIS & H_S3
    C_APP --> C_PG & C_REDIS & C_MINIO
    SAAS_CP --> SAAS_PG & SAAS_REDIS & SAAS_S3
```

---

## DFD-16 — Security Data Boundary (Level 2)
## What crosses the data plane / control plane boundary — and what never does

```mermaid
flowchart LR
    subgraph CUSTOMER_ENV["Customer Environment (never leaves this boundary)"]
        SOURCE["Source code\n(.ts .py .go .java etc.)"]
        DEPS["Dependency files\npackage.json · go.mod\nrequirements.txt"]
        HISTORY["Git history\ncommits · branches\nblame data"]
        SECRETS_LOCAL["Secrets (found)\nAPI keys · passwords\n(values detected, not transmitted)"]
        AI_LOCAL["AI inference\nOllama / Bedrock\nruns locally"]
    end

    BOUNDARY{{"Trust Boundary\nHTTPS POST\ngzip compressed\nBearer auth"}}

    subgraph ASTRA_ENV["Astra Control Plane (only receives this)"]
        FINDINGS_DATA["UnifiedFinding[]\nscanner · rule_id · title\nseverity · category\nfile path + line numbers\ncode_snippet (excerpt only)\ncwe · owasp\nai_explanation · ai_fix\nexploit_score · fingerprint"]
        SCAN_META["Scan metadata\nbranch · commit_sha · pr_number\ntriggered_by · duration\nscanners_run · agent_version"]
        BIZ_CANDIDATES["BusinessLogicRule[]\nCANDIDATE status\nrule_text (natural language)\nconfidence · evidence_files[]"]
    end

    SOURCE -.->|"NEVER CROSSES"| BOUNDARY
    DEPS -.->|"NEVER CROSSES"| BOUNDARY
    HISTORY -.->|"NEVER CROSSES"| BOUNDARY
    SECRETS_LOCAL -.->|"NEVER CROSSES\n(only rule_id + file + line)"| BOUNDARY
    AI_LOCAL -.->|"NEVER CROSSES"| BOUNDARY

    FINDINGS_DATA -->|"CROSSES"| BOUNDARY
    SCAN_META -->|"CROSSES"| BOUNDARY
    BIZ_CANDIDATES -->|"CROSSES"| BOUNDARY

    BOUNDARY --> ASTRA_ENV
```

---

## DFD-17 — Agentic Auto-Fix Flow (Level 2)
## How Astra generates and proposes code fixes

```mermaid
flowchart TD
    FINDING["Finding\nCRITICAL or HIGH\nwith ai_fix suggestion"]

    subgraph AUTOFIX["Agentic Auto-Fix Engine"]
        CLASSIFY["Classify fix type\nsimple: single-file change\ncomplex: multi-file refactor\nbusiness-logic: needs human input"]
        FETCH_CTX["Fetch full file context\nread file from repo\nincluding surrounding functions"]
        AI_FIX["AI generates fix\nusing full file context\n+ UnifiedFinding details\n+ ai_fix suggestion as seed"]
        VALIDATE["Validate fix\nparse AST: no syntax errors\ncheck fix doesn't break\nexisting patterns"]
        DIFF["Generate unified diff\nminimal change\npreserve code style"]
    end

    subgraph PR_FLOW["PR Creation Flow"]
        BRANCH["Create feature branch\nastra/fix-{fingerprint-short}\nfrom default branch"]
        COMMIT["Commit the fix\n'security: fix {title} [{severity}]'\nco-authored-by: Astra Security'"]
        OPEN_PR["Open draft PR\ntitle: [Astra] Fix: {finding.title}\nbody: AI explanation + remediation\nlinks to finding in dashboard"]
        REVIEW_REQ["Request review\nfrom finding assignee\nor code owners"]
    end

    subgraph HUMAN["Human Approval (always required)"]
        DEV_REVIEW["Developer reviews\nthe draft PR diff"]
        APPROVE["Approve + merge\nfinding auto-marked FIXED\nJira ticket closed"]
        REQUEST_CHANGE["Request changes\nAstra refines the fix\nre-runs AI with feedback"]
        REJECT_FIX["Reject fix\nmark as ACCEPTED_RISK\nor FALSE_POSITIVE"]
    end

    FINDING --> CLASSIFY
    CLASSIFY -->|"simple"| FETCH_CTX
    CLASSIFY -->|"complex / biz-logic"| HUMAN
    FETCH_CTX --> AI_FIX
    AI_FIX --> VALIDATE
    VALIDATE -->|"valid"| DIFF
    VALIDATE -->|"invalid"| AI_FIX
    DIFF --> BRANCH
    BRANCH --> COMMIT
    COMMIT --> OPEN_PR
    OPEN_PR --> REVIEW_REQ
    REVIEW_REQ --> DEV_REVIEW
    DEV_REVIEW --> APPROVE & REQUEST_CHANGE & REJECT_FIX
    REQUEST_CHANGE --> AI_FIX
    APPROVE -->|"auto-mark FIXED"| PG[("PostgreSQL")]
```

---

## DFD-18 — MCP / AI Agent Integration (Level 2)
## How Astra acts as the security policy layer for AI coding agents

```mermaid
flowchart TD
    subgraph AGENTS["AI Coding Agents"]
        CLAUDE_CODE["Claude Code"]
        CURSOR["Cursor / BugBot"]
        COPILOT["GitHub Copilot"]
        CODEX["OpenAI Codex"]
        DEVIN["Devin / Cognition"]
    end

    subgraph MCP["Astra MCP Server"]
        MCP_SERVER["MCP Server\nModel Context Protocol\nastra-mcp-server"]
        TOOLS["Exposed Tools\nscan_file(path)\ncheck_policy(code)\nget_findings(repo)\nverify_fix(diff)\nget_business_rules(repo)"]
    end

    subgraph ASTRA_BACKEND["Astra Backend"]
        POLICY_CHECK["Policy check\ninstant: does this code\nviolate confirmed\nbusiness logic rules?"]
        FINDING_LOOKUP["Finding lookup\nare there existing findings\nfor this file/function?"]
        RULE_DIST["Confirmed business rules\ndistributed to agent context\n'All /charge routes must check auth'\n'Amount must come from DB'"]
        EVIDENCE["Verifiable evidence\ndata flow paths\ncall graphs\nreachability analysis"]
    end

    subgraph WORKFLOW["Agent Workflow with Astra"]
        AGENT_WRITES["Agent writes code"]
        POLICY_GATE["Policy gate\ncall check_policy(code)\nbefore commit"]
        SCAN_CALL["Scan call\nscan_file(path)\nreal-time feedback"]
        FIX_VERIFY["Fix verification\nverify_fix(diff)\nconfirm fix is complete"]
        COMMIT_SAFE["Safe to commit\nno policy violations\nno known findings"]
        BLOCKED["Blocked\npolicy violation detected\nagent must revise"]
    end

    CLAUDE_CODE & CURSOR & COPILOT & CODEX & DEVIN -->|"MCP protocol"| MCP_SERVER
    MCP_SERVER --> TOOLS
    TOOLS --> POLICY_CHECK & FINDING_LOOKUP & RULE_DIST & EVIDENCE
    POLICY_CHECK & FINDING_LOOKUP & RULE_DIST & EVIDENCE -->|"structured response"| MCP_SERVER
    MCP_SERVER -->|"tool result"| AGENTS
    AGENT_WRITES --> POLICY_GATE
    POLICY_GATE -->|"no violation"| SCAN_CALL
    POLICY_GATE -->|"violation found"| BLOCKED
    BLOCKED --> AGENT_WRITES
    SCAN_CALL -->|"clean"| FIX_VERIFY
    FIX_VERIFY -->|"verified"| COMMIT_SAFE
```

---

## DFD-19 — Observability & Monitoring (Level 2)
## How Astra monitors itself and exposes telemetry

```mermaid
flowchart TD
    subgraph INSTRUMENTATION["Instrumentation Points"]
        AI_CALLS["AI call logging\nevery provider call\nGET /api/v1/observability/ai-calls\n→ ai_call_logs table"]
        NODE_TIMING["Node execution timing\nper node · per scan\ndurationMs tracked in Job rows"]
        TOKEN_USAGE["Token usage\ninput + output + thinking\nper node · per model\naccumulated in ScanState"]
        SCAN_STATUS["Scan status events\nPENDING → RUNNING → COMPLETED/FAILED\ntimestamped transitions"]
        API_METRICS["API request metrics\nlatency · status codes\nper endpoint"]
        ERROR_LOG["Error log\nper-node failures\nnode.errors[] in ScanState\nstack traces in Job.errorJson"]
    end

    subgraph OBSERVABILITY_UI["Observability Dashboard (/observability)"]
        AI_TABLE["AI Call Log table\nprovider · model · tokens\nduration · status · cost estimate"]
        SCAN_TIMELINE["Scan timeline\nper-node execution breakdown\nwhere time was spent"]
        TOKEN_CHART["Token usage charts\nby provider · by model\nby node · by org"]
        ERROR_TABLE["Error table\nfailed scans · failed nodes\nretry counts"]
        COST_EST["Cost estimation\n$/scan · $/month\nby provider · by model"]
    end

    subgraph HEALTH["Health Endpoints"]
        HEALTH_LIVE["GET /health/live\nliveness probe\n{ status: ok }"]
        HEALTH_READY["GET /health/ready\nreadiness probe\ncheck DB + Redis connectivity"]
        METRICS["GET /metrics\nPrometheus-compatible\nfor k8s monitoring"]
    end

    PG[("PostgreSQL\nai_call_logs\njobs\nscans")]

    AI_CALLS & NODE_TIMING & TOKEN_USAGE & SCAN_STATUS & API_METRICS & ERROR_LOG -->|"write"| PG
    PG -->|"read"| AI_TABLE & SCAN_TIMELINE & TOKEN_CHART & ERROR_TABLE & COST_EST
    HEALTH_LIVE & HEALTH_READY & METRICS -->|"check"| PG
```
