# Astra — Technology Stack

## Full Stack Diagram

```mermaid
graph TB
    subgraph FRONTEND["Frontend — React + IBM Carbon"]
        NEXT["Next.js 15\nApp Router"]
        CARBON["@carbon/react\nIBM Design System"]
        PLEX["IBM Plex Sans\nWeight 300/400/600"]
        SCSS["SCSS / CSS Modules"]
    end
    
    subgraph CONTROL["Control Plane — Node.js"]
        FASTIFY["Fastify\nHTTP/2, schema validation"]
        DRIZZLE["Drizzle ORM\nType-safe SQL"]
        ZOD["Zod\nRuntime validation"]
        WS["WebSocket\nReal-time updates"]
    end
    
    subgraph DATA["Data Plane — Python"]
        PY["Python 3.12"]
        ASYNC["asyncio\nParallel scanner execution"]
        SUBP["subprocess\nScanner binary invocation"]
        FASTAPI["FastAPI / Uvicorn\nHTTP server mode"]
    end
    
    subgraph SCANNERS["Scanner Binaries"]
        SEMGREP["Semgrep\nPython-native"]
        TRIVY["Trivy\nGo binary"]
        GITLEAKS["Gitleaks\nGo binary"]
        CHECKOV["Checkov\nPython-native"]
        BANDIT["Bandit\nPython-native"]
    end
    
    subgraph AI["AI Layer"]
        OLLAMA["Ollama SDK\nLocal + Cloud API"]
        ANTHROPIC["Anthropic SDK\nClaude deep scan"]
        OPENAI["OpenAI SDK\nGPT deep scan"]
    end
    
    subgraph STORAGE["Persistent Storage"]
        PG[("PostgreSQL 16\nPrimary database")]
        RD[("Redis 7\nCache + queues")]
        S3[("S3 / MinIO\nObject store")]
    end
    
    subgraph INFRA["Infrastructure"]
        DOCKER["Docker\nContainer runtime"]
        COMPOSE["Docker Compose\nLocal dev"]
        K8S["Kubernetes\nProduction"]
        HELM["Helm Charts\nDeployment"]
    end
    
    FRONTEND -->|"HTTPS / WebSocket"| CONTROL
    CONTROL -->|"HTTP / gRPC"| DATA
    DATA --> SCANNERS
    DATA --> AI
    DATA --> STORAGE
    CONTROL --> STORAGE
    INFRA --> DATA
    INFRA --> CONTROL
    INFRA --> STORAGE
```

---

## Stack Rationale

### Frontend: Next.js + IBM Carbon
- **Why Next.js 15**: App Router, Server Components, API routes in one framework
- **Why IBM Carbon**: Enterprise-grade, IBM's design system, 0px border-radius, weight-300 display type
- **IBM Plex Sans**: Free/open-source SIL OFL, distinctive weight-300 for display

### Control Plane: Node.js + Fastify
- **Why Node.js**: User's stack preference, consistent with frontend
- **Why Fastify**: 3x faster than Express, built-in schema validation, HTTP/2 support
- **Why Drizzle**: Type-safe SQL, better than Prisma for complex queries, lighter weight
- **Why Zod**: Runtime validation, works with both Fastify and TypeScript

### Data Plane: Python
- **Why Python**: Semgrep, Bandit, Checkov are Python-native (importable as libraries)
- **Better subprocess handling**: For invoking Trivy, Gitleaks, Bearer
- **Ollama Python SDK**: First-class support for local + cloud inference
- **Anthropic/OpenAI SDKs**: Native Python libraries for deep scanning

### Storage
- **PostgreSQL**: Relational data (findings, policies, users, audit log)
- **Redis**: Job queues, dedup cache, WebSocket pub/sub, sessions
- **S3/MinIO**: Raw scanner outputs, PDF reports, scan artifacts

### Infrastructure
- **Docker**: Container runtime for both Data Plane and Control Plane
- **Docker Compose**: Local development and self-hosted deployments
- **Kubernetes + Helm**: Production SaaS deployments

---

## Language Support Matrix

| Language | Semgrep | Trivy | Gitleaks | Checkov | Bandit | AI Scan |
|----------|---------|-------|----------|---------|--------|---------|
| Python | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| JavaScript/TypeScript | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| Java | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| Go | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| Ruby | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| Rust | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| Terraform | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Dockerfile | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| YAML/JSON | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Helm/K8s | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |

---

## AI Provider Comparison

| Provider | Model | Speed | Cost | Privacy | Use Case |
|----------|-------|-------|------|---------|----------|
| Ollama Local | deepseek-coder:6.7b | Slow | Free | Air-gapped | Per-file scan |
| Ollama Local | llama3:8b | Slow | Free | Air-gapped | Business logic |
| Ollama Cloud | deepseek-coder | Fast | Low | Cloud-hosted | Per-file scan |
| Ollama Cloud | llama3 | Fast | Low | Cloud-hosted | Business logic |
| Anthropic Claude | claude-sonnet-4-6 | Fast | High | Cloud (opt-in) | Deep scan |
| OpenAI | gpt-4o | Fast | High | Cloud (opt-in) | Deep scan |
