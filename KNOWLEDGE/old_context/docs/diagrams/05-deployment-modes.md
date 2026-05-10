# Astra — Deployment Modes

## Three Deployment Models

```mermaid
graph TB
    subgraph SAAS["SaaS — Astra Hosted"]
        direction TB
        ASTRA["Astra Cloud\nControl Plane + Dashboard"]
        CUSTOMER["Customer CI/CD\nData Plane Agent only"]
        
        CUSTOMER -->|"Findings only\nHTTPS POST"| ASTRA
    end
    
    subgraph SELF["Self-Hosted — Customer Hosted"]
        direction TB
        CP["Control Plane\nCustomer infrastructure"]
        DP["Data Plane\nSame cluster / VM"]
        DB[("PostgreSQL + Redis\nCustomer managed")]
        
        DP -->|"Internal network"| CP
        CP --> DB
    end
    
    subgraph HYBRID["Hybrid — Astra Control + Customer Data"]
        direction TB
        ACP["Astra Cloud\nControl Plane"]
        CDP["Customer Infrastructure\nData Plane"]
        
        CDP -->|"Findings only\nHTTPS POST"| ACP
    end
    
    SAAS ~~~ SELF ~~~ HYBRID
```

---

## Deployment Mode Comparison

| Aspect | SaaS | Self-Hosted | Hybrid |
|--------|------|-------------|--------|
| **Control Plane** | Astra-hosted | Customer-hosted | Astra-hosted |
| **Data Plane** | Customer CI | Customer infrastructure | Customer infrastructure |
| **Database** | Astra-managed | Customer-managed | Astra-managed |
| **Onboarding** | Fastest (minutes) | Slower (hours) | Medium |
| **Data Sovereignty** | Findings only leave | Full control | Findings only leave |
| **Custom Policies** | ✅ | ✅ | ✅ |
| **SSO Integration** | ✅ SAML/OIDC | ✅ SAML/OIDC | ✅ SAML/OIDC |
| **Air-gapped** | ❌ | ✅ | ❌ |
| **Maintenance** | Astra handles | Customer handles | Astra handles CP |
| **Cost Model** | Per-seat / per-scan | License + support | Per-seat + infra |

---

## SaaS Architecture

```mermaid
graph LR
    subgraph CUSTOMER["Customer Environment"]
        CI["GitHub Actions / GitLab CI / Jenkins"]
        DP["Data Plane Agent\nDocker container"]
        
        CI -->|"docker run"| DP
    end
    
    subgraph ASTRA["Astra Cloud"]
        LB["Load Balancer\nCloudflare / AWS ALB"]
        CP1["Control Plane\nNode 1"]
        CP2["Control Plane\nNode 2"]
        PG[("PostgreSQL\nRDS / Cloud SQL")]
        RD[("Redis\nElastiCache")]
        S3[("S3\nFindings + Artifacts")]
    end
    
    DP -->|"HTTPS POST\ngzipped JSON"| LB
    LB --> CP1
    LB --> CP2
    CP1 --> PG
    CP1 --> RD
    CP1 --> S3
    CP2 --> PG
    CP2 --> RD
    CP2 --> S3
```

---

## Self-Hosted Architecture

```mermaid
graph TB
    subgraph CLUSTER["Customer Kubernetes Cluster"]
        subgraph NS_CP["namespace: astra-control"]
            CP["Control Plane\nFastify + Next.js"]
            CP_HPA["Horizontal Pod Autoscaler\n2-10 replicas"]
        end
        
        subgraph NS_DP["namespace: astra-data"]
            DP["Data Plane Agent\nPython + scanners"]
            DP_JOB["Kubernetes Job\nOne per scan"]
        end
        
        subgraph NS_DB["namespace: astra-db"]
            PG[("PostgreSQL\nStatefulSet")]
            RD[("Redis\nStatefulSet")]
            S3[("MinIO\nObject Store")]
        end
        
        subgraph NS_INGRESS["namespace: ingress"]
            ING["Ingress Controller\nNGINX / Traefik"]
            CERT["cert-manager\nTLS certificates"]
        end
    end
    
    ING --> CP
    CP --> PG
    CP --> RD
    CP --> S3
    DP --> PG
    DP --> S3
```

---

## Docker Compose (Development / Small Team)

```yaml
# docker-compose.yml — Self-hosted single-node
version: '3.8'
services:
  control-plane:
    image: ghcr.io/astra/control-plane:latest
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgres://astra:pass@postgres:5432/astra
      - REDIS_URL=redis://redis:6379
      - S3_ENDPOINT=http://minio:9000
    depends_on:
      - postgres
      - redis
      - minio

  data-plane:
    image: ghcr.io/astra/data-plane:latest
    environment:
      - MODE=server
      - CONTROL_PLANE_URL=http://control-plane:3000
      - OLLAMA_URL=http://ollama:11434
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    depends_on:
      - ollama
      - postgres

  ollama:
    image: ollama/ollama:latest
    volumes:
      - ollama_data:/root/.ollama

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: astra
      POSTGRES_USER: astra
      POSTGRES_PASSWORD: pass
    volumes:
      - pg_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  minio:
    image: minio/minio
    command: server /data
    environment:
      MINIO_ROOT_USER: astra
      MINIO_ROOT_PASSWORD: astrapass
    volumes:
      - minio_data:/data

volumes:
  ollama_data:
  pg_data:
  redis_data:
  minio_data:
```
