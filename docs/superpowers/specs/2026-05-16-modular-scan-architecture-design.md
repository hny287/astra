# Modular Scan Architecture Design

**Date:** 2026-05-16
**Status:** Draft
**Author:** AI-assisted design session

---

## 1. Overview

The platform currently runs a single scan pipeline (code scan) that clones a repo, discovers files, runs SAST/SCA/secret scanners, and enriches findings with AI. This design introduces a **modular scan architecture** where each scanning domain is an independent module with its own pipeline DAG, Data Plane image, feature gate, and API routes — while sharing a common Control Plane (auth, org, project, billing, findings store, AI enrichment).

This adds the following module pipelines:

| Module | Pipeline | Purpose |
|--------|----------|---------|
| **code-scan** | (existing) | Source code scanning (SAST, SCA, Secrets, IaC, Data Flow) |
| **cloud-scan** | Cloud Infrastructure Pipeline | Cloud misconfiguration and compliance scanning (AWS, Azure, GCP) |
| **compliance** | Compliance Mapping Pipeline | Framework mapping (CIS, PCI-DSS, NIST, SOC2, HIPAA, ISO 27001) |
| **pci-dss** | PCI DSS / ASV Module | Internal PCI compliance + ASV report import + attestation |
| **network-scan** | Network Vulnerability Pipeline | Network vulnerability scanning, port auditing, external attack surface |
| **sbom** | Software Bill of Materials Pipeline | Dependency inventory, license scanning, vulnerability correlation |
| **runtime-scan** | Runtime Security Pipeline | Container/K8s runtime threat detection (Falco agent) |
| **iac-scan** | IaC Policy Pipeline | Infrastructure-as-Code policy scanning (Terraform, CloudFormation, K8s manifests) |

Plus service modules (not pipelines):

| Module | Purpose |
|--------|---------|
| **ai-chat** | Multi-provider AI chat |
| **rbac** | Role-based access control |
| **multitenancy** | Org/tenant isolation |
| **payments** | Billing and licensing |

---

## 2. Design Principles

1. **Module independence**: Each pipeline module can be enabled/disabled via feature gate without affecting others. Disabled modules exclude their routes, nav, DB migrations, and Data Plane images.
2. **Unified findings**: All pipelines emit `UnifiedFinding` rows — same schema, same fingerprint dedup, same UI. Modules differ in `category` and `scanner` values.
3. **Separate Data Plane images**: Each pipeline module gets its own Docker image with only the tools it needs (no Trivy in the cloud-scan image, no Prowler in the code-scan image).
4. **Shared Control Plane**: Auth, org, project, billing, findings, AI enrichment, and UI shell are shared across all modules.
5. **Pipeline-per-module**: Each module defines its own DAG. Nodes may be shared (normalize, enrich, persist) but the overall pipeline is module-specific.
6. **Feature gate cascading**: `NEXT_PUBLIC_FEATURES` sets platform ceiling; org plan sets org ceiling; project features set project ceiling. Effective = min(platform, org, project).

---

## 3. Module Registry

Each module exports a `manifest.ts`:

```typescript
interface ModuleManifest {
  id: string;                    // e.g., 'cloud-scan', 'pci-dss'
  name: string;                  // Display name
  version: string;
  description: string;
  featureGate: string;           // Feature gate key
  dependencies: string[];        // Other module IDs this module requires
  routes: RouteDefinition[];     // API routes this module registers
  navItems: NavItemDefinition[]; // Sidebar/nav entries
  permissions: string[];          // Permissions this module adds
  models: PrismaModel[];         // DB models this module requires
  migrations: string[];          // Migration files
  dataPlaneImage?: string;       // Docker image name for Data Plane
  pipeline: PipelineDefinition;  // DAG definition
  envRequired: string[];         // Required env vars
}
```

App boot reads enabled features → loads only matching module manifests → registers routes, nav, DB migrations, and triggers Data Plane deployments.

---

## 4. Pipeline Definitions

### 4A. Code Scan Pipeline (existing, no changes to DAG)

```
clone → discover → git_ingest → git_diagram → tool_scan → deep_scan → cross_file → aggregate → persist
```

Scanners: Trivy (SCA/IAC/Secrets), Semgrep (SAST), Gitleaks (Secrets), Bearer (Data Flow)

Feature gate: `code_scan`
Data Plane image: `astra-code-scan`
API prefix: `/v1/scans` (existing)

### 4B. Cloud Scan Pipeline (new)

```
auth → discover → connect → scan → normalize → compliance_map → enrich → persist
```

| Node | Purpose |
|------|---------|
| **auth** | Validate cloud credentials (AWS Access Key, Azure SPN, GCP Service Account key). Store connection status in `CloudAccount` model. |
| **discover** | Enumerate cloud resources (VPCs, buckets, IAM policies, security groups, compute instances, databases). Store inventory in `CloudResource` model. |
| **connect** | Test API connectivity and permissions. Verify read-only access. Store connectivity status per service. |
| **scan** | Run Prowler (AWS/Azure/GCP), ScoutSuite (AWS/Azure/GCP), kube-bench (K8s) as subprocesses. Each scanner run produces raw JSON output. |
| **normalize** | Map cloud scanner findings to `UnifiedFinding`. New categories: `CLOUD_MISCONFIG`, `COMPLIANCE`. New scanner values: `prowler-aws`, `prowler-azure`, `prowler-gcp`, `scoutsuite-aws`, `scoutsuite-azure`, `scoutsuite-gcp`, `kube-bench`. |
| **compliance_map** | Map findings to compliance frameworks (CIS AWS Benchmark, PCI-DSS, NIST 800-53, SOC2, HIPAA, ISO 27001). Store mappings in `ComplianceMapping` model. |
| **enrich** | AI enrichment (same as code pipeline). Adds `aiExplanation`, `aiFix`, `exploitScore` to findings. |
| **persist** | Upsert findings to DB. Same `upsertFinding` path as code pipeline. |

Feature gate: `cloud_scan`
Data Plane image: `astra-cloud-scan`
API prefix: `/v1/cloud-scans`

**Cloud Scan scanners detail:**

| Scanner | Language | Platforms | Compliance Frameworks | Output |
|---------|----------|-----------|----------------------|--------|
| Prowler | Python | AWS (595 checks), Azure (167), GCP (102), K8s (83), M365, GitHub, OCI, Alibaba | 43 frameworks including CIS, PCI-DSS, NIST, SOC2, HIPAA, ISO 27001, GDPR, FedRAMP | JSON, CSV, HTML, SARIF, OCSF |
| ScoutSuite | Python | AWS, Azure, GCP, Alibaba (alpha), Oracle (alpha) | Cloud security posture (not formally mapped to compliance frameworks) | Interactive HTML, JSON |
| kube-bench | Go | K8s (CIS Benchmarks) | CIS Kubernetes Benchmark | JSON, JUnit XML |

**Cloud account model:**

```typescript
model CloudAccount {
  id              String   @id @default(cuid())
  projectId       String
  provider        String   // 'aws' | 'azure' | 'gcp'
  accountId       String   // AWS account ID, Azure tenant ID, GCP project ID
  displayName     String
  credentials     Json     // Encrypted. AWS: { accessKeyId, secretAccessKey, region }, Azure: { tenantId, clientId, clientSecret, subscriptionId }, GCP: {projectId, clientEmail, privateKey }
  status          String   @default("pending")  // pending | connected | error | scanning
  lastScanAt      DateTime?
  lastScanId      String?
  errorDetail     String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  project         Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  scans           CloudScan[]
  resources       CloudResource[]

  @@unique([projectId, provider, accountId])
  @@index([provider])
  @@index([status])
}

model CloudScan {
  id               String       @id @default(cuid())
  cloudAccountId   String
  scanId           String?      // Link to unified Scan model
  status           ScanStatus   @default(PENDING)
  scanners         String[]     @default(["prowler", "scoutsuite"])
  frameworks       String[]     @default([]) // ["cis", "pci-dss", "nist-800-53", "soc2"]
  totalInputTokens Int          @default(0)
  totalOutputTokens Int         @default(0)
  configJson       Json
  durationSeconds  Int?
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt

  cloudAccount     CloudAccount @relation(fields: [cloudAccountId], references: [id], onDelete: Cascade)
  scan             Scan?

  @@index([cloudAccountId])
  @@index([status])
}

model CloudResource {
  id              String   @id @default(cuid())
  cloudAccountId  String
  resourceType    String   // e.g., 'aws:vpc', 'aws:s3-bucket', 'azure:storage-account', 'gcp:compute-instance'
  resourceId      String   // Cloud-provider resource identifier
  resourceName    String
  region          String?
  configJson      Json     // Resource configuration snapshot
  labels          Json     @default("{}")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  cloudAccount    CloudAccount @relation(fields: [cloudAccountId], references: [id], onDelete: Cascade)

  @@unique([cloudAccountId, resourceType, resourceId])
  @@index([resourceType])
  @@index([cloudAccountId])
}
```

### 4C. Compliance Module (new)

```
ingest → map → score → report → persist
```

| Node | Purpose |
|------|---------|
| **ingest** | Load findings from one or more scan pipelines (code-scan, cloud-scan, iac-scan). Accept manual evidence upload. |
| **map** | Map findings to compliance framework controls. Use Prowler's 43 framework mappings + custom Rego policies. |
| **score** | Calculate compliance scores per framework per control. Weighted by severity and coverage. |
| **report** | Generate compliance reports (PDF, HTML, SARIF). PCI-DSS attestation format. SOC2 Type II evidence package. |
| **persist** | Store `ComplianceMapping`, `ComplianceReport`, `ComplianceControl` records. |

Feature gate: `compliance`
Data Plane: Runs in Control Plane (no separate image — reads existing findings)
API prefix: `/v1/compliance`

**Compliance models:**

```typescript
model ComplianceFramework {
  id          String   @id @default(cuid())
  name        String   @unique // e.g., 'cis-aws-v1.5', 'pci-dss-v4.0', 'nist-800-53-r5', 'soc2', 'hipaa', 'iso-27001'
  version     String
  provider    String?  // null = universal, 'aws' | 'azure' | 'gcp' = cloud-specific
  description String
  controls    ComplianceControl[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model ComplianceControl {
  id            String   @id @default(cuid())
  frameworkId   String
  controlId     String   // e.g., 'PCI-DSS-1.1', 'CIS-AWS-1.1', 'NIST-AC-1'
  title         String
  description   String
  severity      String?  // 'critical' | 'high' | 'medium' | 'low'
  category      String?
  mappings      ComplianceMapping[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  framework     ComplianceFramework @relation(fields: [frameworkId], references: [id], onDelete: Cascade)

  @@unique([frameworkId, controlId])
  @@index([frameworkId])
}

model ComplianceMapping {
  id              String   @id @default(cuid())
  controlId       String
  findingId       String?  // Link to UnifiedFinding
  cloudScanId     String?  // Link to cloud scan finding
  status          String   @default("open") // open | passing | failed | not_applicable | manual_review
  evidence        Json?
  projectScope    String?  // null = global, or projectId
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  control         ComplianceControl @relation(fields: [controlId], references: [id], onDelete: Cascade)
  finding         Finding?  @relation(fields: [findingId], references: [id], onDelete: SetNull)

  @@index([controlId])
  @@index([status])
}

model ComplianceReport {
  id              String   @id @default(cuid())
  projectId       String
  frameworkId     String
  scanIds         String[] // Links to scans that contributed findings
  status          String   @default("pending") // pending | generating | ready | error
  scoreOverall   Float?
  scoreByControl Json?
  reportUrl       String?  // S3/URL to generated PDF/HTML
  reportFormat    String   @default("pdf") // pdf | html | sarif | json
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([projectId])
  @@index([frameworkId])
}
```

### 4D. PCI DSS / ASV Module (new)

```
internal_scan → asv_import → merge → attest → persist
```

| Node | Purpose |
|------|---------|
| **internal_scan** | Run Prowler PCI-DSS checks + OpenSCAP (OS-level) for internal posture. Continuous scanning, not quarterly. |
| **asv_import** | Import external ASV scan results from certified ASV vendors (Qualys, Rapid7, Tenable) via API or file upload (XML/CSV). Parse into `UnifiedFinding` format with `scanner: 'asv-qualys'`, `asv-rapid7'`, etc. |
| **merge** | Deduplicate internal findings with ASV findings by fingerprint. Track which findings are internal-only, ASV-only, or both. |
| **attest** | Generate attestation-ready reports. Track remediation status. Produce PCI DSS v4.0 compliant evidence for QSA review. |
| **persist** | Store PCI-specific findings, attestation records, remediation tracking. |

Feature gate: `pci_dss`
Data Plane image: `astra-pci-dss` (includes Prowler + OpenSCAP)
API prefix: `/v1/pci-dss`

**PCI DSS models:**

```typescript
model AsvScanImport {
  id              String   @id @default(cuid())
  projectId       String
  provider        String   // 'qualys' | 'rapid7' | 'tenable' | 'manual'
  externalScanId  String?  // ASV vendor's scan ID
  scanDate        DateTime
  reportFormat    String   @default("xml") // xml | csv | json | pdf
  rawReport       Json?    // Parsed ASV report data
  overallResult   String?  // 'pass' | 'fail' | 'warning'
  importedAt      DateTime @default(now())

  @@index([projectId])
  @@index([provider])
}

model PciDssRequirement {
  id              String   @id @default(cuid())
  requirement     String   // e.g., '1.1', '11.1.2', '12.1'
  title           String
  description     String
  category        String   // 'firewall' | 'encryption' | 'vulnerability' | 'access-control' | etc.
  evidenceType    String   // 'scan' | 'policy' | 'interview' | 'observation'
  createdAt       DateTime @default(now())

  @@unique([requirement])
}

model PciAttestation {
  id              String   @id @default(cuid())
  projectId       String
  quarter         String   // 'Q1-2026', 'Q2-2026', etc.
  asvScanImportId String?
  internalScanId  String?
  status          String   @default("pending") // pending | in_review | passed | failed | remediation
  remediationPlan Json?    // Findings that need remediation before rescan
  attestationUrl  String?  // Signed attestation document URL
  reviewedBy      String?
  reviewedAt      DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([projectId])
  @@index([quarter])
  @@index([status])
}
```

### 4E. Network Scan Pipeline (new)

```
target_discover → port_scan → vuln_scan → service_detect → normalize → enrich → persist
```

| Node | Purpose |
|------|---------|
| **target_discover** | Enumerate network targets from cloud-scan resources, project config, or manual entry. DNS resolution, IP range expansion. |
| **port_scan** | Port scanning (Nmap). Identify open ports, running services, service versions. |
| **vuln_scan** | Vulnerability scanning (Nmap NSE scripts, OpenVAS/Nessus integration). CVE identification on discovered services. |
| **service_detect** | Service fingerprinting, SSL/TLS certificate analysis, protocol version detection. |
| **normalize** | Map network findings to `UnifiedFinding`. New category: `VULNERABILITY`. New scanner values: `nmap`, `openvas`, `nessus-pro`. |
| **enrich** | AI enrichment for exploitation guidance. |
| **persist** | Upsert findings. |

Feature gate: `network_scan`
Data Plane image: `astra-network-scan`
API prefix: `/v1/network-scans`

**Network Scan models:**

```typescript
model NetworkScanTarget {
  id              String   @id @default(cuid())
  projectId       String
  name            String   // e.g., 'Production Web Tier'
  targets         String[] // IPs, CIDRs, hostnames
  excludedTargets String[] @default([])
  scanProfile     String   @default("standard") // quick | standard | deep | custom
  lastScanAt      DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  project         Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  scans           NetworkScan[]

  @@index([projectId])
}

model NetworkScan {
  id                String       @id @default(cuid())
  targetId          String
  scanId            String?      // Link to unified Scan model
  status            ScanStatus   @default(PENDING)
  scanners          String[]     @default(["nmap"])
  portsFound        Int          @default(0)
  servicesFound     Int          @default(0)
  vulnsFound        Int          @default(0)
  totalInputTokens  Int          @default(0)
  totalOutputTokens Int          @default(0)
  configJson        Json
  durationSeconds   Int?
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt

  target            NetworkScanTarget @relation(fields: [targetId], references: [id], onDelete: Cascade)
  scan              Scan?

  @@index([targetId])
  @@index([status])
}

model NetworkHost {
  id              String   @id @default(cuid())
  networkScanId   String
  ip              String
  hostname        String?
  os              String?
  osVersion       String?
  macAddress      String?
  ports           Json     @default("[]") // [{port, protocol, service, version, state}]
  createdAt       DateTime @default(now())

  networkScan     NetworkScan @relation(fields: [networkScanId], references: [id], onDelete: Cascade)

  @@unique([networkScanId, ip])
  @@index([networkScanId])
}
```

**Network scan tools:**

| Tool | Purpose | Output |
|------|---------|--------|
| Nmap | Port scanning, service detection, OS fingerprinting | XML, JSON |
| OpenVAS | Vulnerability scanning (open-source Nessus fork) | XML, CSV |
| Nmap NSE Scripts | Vulnerability detection, SSL/TLS analysis | XML, JSON |

### 4F. SBOM Pipeline (new)

```
discover → inventory → vulnerability → license → enrich → persist
```

| Node | Purpose |
|------|---------|
| **discover** | Clone repo (reuse code-scan clone node) or ingest uploaded package manifests. |
| **inventory** | Parse package.json, requirements.txt, go.mod, Cargo.toml, pom.xml, .csproj, etc. Build dependency tree with transitive dependencies. |
| **vulnerability** | Check each dependency against vulnerability databases (OSV, GitHub Advisory, Snyk). Map CVEs to dependencies. |
| **license** | Scan dependency licenses (SPDX). Flag LGPL, GPL, proprietary license conflicts. |
| **enrich** | AI enrichment: vulnerability exploitation guidance, upgrade path recommendations. |
| **persist** | Store `SbomEntry` records + `UnifiedFinding` for vulnerabilities. |

Feature gate: `sbom`
Data Plane image: `astra-sbom` (includes Trivy for SBOM generation, Syft, Grype)
API prefix: `/v1/sbom`

**SBOM models:**

```typescript
model Sbom {
  id            String   @id @default(cuid())
  projectId     String
  scanId        String?  // Link to scan that generated this SBOM
  format        String   @default("cyclonedx") // cyclonedx | spdx | syft
  version       String?
  components    Int      @default(0)
  licensesUnknown Int    @default(0)
  licensesConflict Int   @default(0)
  vulnerabilities Int    @default(0)
  rawSbom       Json     // Full SBOM document
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  project       Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  scan          Scan?     @relation(fields: [scanId], references: [id], onDelete: SetNull)
  entries       SbomEntry[]

  @@index([projectId])
}

model SbomEntry {
  id            String   @id @default(cuid())
  sbomId        String
  name          String
  version       String
  type          String   // npm | pip | maven | cargo | go | nuget | gem | etc.
  license       String?  // SPDX identifier
  licenseUrl    String?
  isDirect      Boolean  @default(false)
  isDev         Boolean  @default(false)
  transitiveDepth Int?
  parentPkg     String?  // Parent dependency name
  purl          String?  // Package URL (purl) identifier
  cpe           String?  // CPE identifier
  repoUrl       String?
  description   String?
  createdAt     DateTime @default(now())

  sbom          Sbom     @relation(fields: [sbomId], references: [id], onDelete: Cascade)
  vulnerabilities SbomVulnerability[]

  @@unique([sbomId, purl])
  @@index([name])
  @@index([license])
  @@index([type])
}

model SbomVulnerability {
  id            String   @id @default(cuid())
  sbomEntryId   String
  cveId         String   // e.g., 'CVE-2024-1234'
  severity      String   // 'critical' | 'high' | 'medium' | 'low'
  cvssScore     Float?
  cvssVector    String?
  description   String
  fixVersion    String?
  publishedAt   DateTime?
  source        String   // 'osv' | 'github-advisory' | 'snyk' | 'npm-audit'
  findingId     String?  // Link to UnifiedFinding
  createdAt     DateTime @default(now())

  sbomEntry     SbomEntry @relation(fields: [sbomEntryId], references: [id], onDelete: Cascade)
  finding       Finding?  @relation(fields: [findingId], references: [id], onDelete: SetNull)

  @@index([sbomEntryId])
  @@index([severity])
  @@index([cveId])
}

model SbomLicenseConflict {
  id            String   @id @default(cuid())
  sbomId        String
  pkgName       String
  pkgLicense    String
  conflictRule  String  // e.g., 'gpl-in-proprietray', 'proprietary-unattributed'
  severity      String   // 'error' | 'warning' | 'info'
  description   String
  createdAt     DateTime @default(now())

  sbom          Sbom     @relation(fields: [sbomId], references: [id], onDelete: Cascade)

  @@index([sbomId])
  @@index([severity])
}
```

### 4G. Runtime Security Pipeline (new)

```
deploy_agent → collect → detect → correlate → alert → persist
```

| Node | Purpose |
|------|---------|
| **deploy_agent** | Deploy Falco agent to target K8s cluster or host. Agent config pushed from platform. |
| **collect** | Collect runtime events (syscalls, container events, network flows) from Falco agents. |
| **detect** | Run Falco detection rules against event stream. Custom rules per project. |
| **correlate** | Correlate runtime events with known vulnerabilities (from code-scan, cloud-scan). Link to existing findings. |
| **alert** | Dispatch real-time alerts (Slack, PagerDuty, webhook) for high-severity events. |
| **persist** | Store as `UnifiedFinding` with `category: RUNTIME`. |

Feature gate: `runtime_scan`
Data Plane image: `astra-runtime` (Falco + falcosidekick)
API prefix: `/v1/runtime`

**Note**: Runtime security is fundamentally different from other pipelines — it's event-driven (continuous stream), not scan-based (one-shot). The Falco agent runs continuously and sends events via falcosidekick webhook to the platform.

### 4H. IaC Scan Pipeline (new)

```
discover → validate → policy_check → enrich → persist
```

| Node | Purpose |
|------|---------|
| **discover** | Find IaC files (Terraform, CloudFormation, K8s manifests, Helm charts, Dockerfiles). |
| **validate** | Structural validation (Terraform validate, CloudFormation lint, YAML lint). |
| **policy_check** | Run Checkov, Trivy IaC, custom Rego policies. Map to compliance frameworks. |
| **enrich** | AI enrichment for misconfiguration guidance. |
| **persist** | Upsert findings with `category: IAC`. |

Feature gate: `iac_scan`
Data Plane image: `astra-code-scan` (shared with code-scan — Checkov is already installed)
API prefix: `/v1/iac-scans`

---

## 5. New Finding Categories

Extend the `Category` enum:

```typescript
enum Category {
  SAST               // Source code analysis
  SCA                // Dependency vulnerabilities
  SECRETS            // Hardcoded secrets/credentials
  IAC                // Infrastructure-as-Code misconfiguration
  DATA_FLOW          // Data flow violations
  BUSINESS_LOGIC     // Business logic flaws (AI-inferred)
  CLOUD_MISCONFIG    // Cloud resource misconfiguration
  COMPLIANCE         // Compliance framework violation
  VULNERABILITY      // Network/host vulnerability
  RUNTIME            // Runtime security event
  LICENSE            // License conflict (from SBOM)
}
```

---

## 6. Unified Scan Model Updates

The existing `Scan` model gains a `scanType` field to distinguish pipeline origins:

```typescript
enum ScanType {
  CODE_SCAN
  CLOUD_SCAN
  COMPLIANCE
  PCI_DSS
  NETWORK_SCAN
  SBOM
  RUNTIME_SCAN
  IAC_SCAN
}

model Scan {
  // ... existing fields ...
  scanType   ScanType @default(CODE_SCAN)
  // ... rest remains the same ...
}
```

Each module's detailed model (CloudScan, NetworkScan, etc.) links to the unified Scan via `scanId`.

---

## 7. Feature Gate Configuration

`NEXT_PUBLIC_FEATURES` env var (or `features.ts` if env not set):

```bash
# All modules enabled (development)
NEXT_PUBLIC_FEATURES=code_scan,cloud_scan,compliance,pci_dss,network_scan,sbom,runtime_scan,iac_scan,ai_chat,rbac,multitenancy,payments

# Minimal (Free tier)
NEXT_PUBLIC_FEATURES=code_scan,ai_chat

# Pro tier
NEXT_PUBLIC_FEATURES=code_scan,cloud_scan,sbom,iac_scan,ai_chat,rbac,payments

# Enterprise
NEXT_PUBLIC_FEATURES=code_scan,cloud_scan,compliance,pci_dss,network_scan,sbom,runtime_scan,iac_scan,ai_chat,rbac,multitenancy,payments
```

Feature gate resolution: `effective = min(platform_env, org_plan, project_config)`

React component: `<FeatureGate feature="cloud_scan">...</FeatureGate>`
API middleware: `requireFeature('cloud_scan')`
Server helper: `isFeatureEnabled('cloud_scan')`

---

## 8. Module Dependency Graph

```
code-scan ──────────────────────────────────┐
                                            │
cloud-scan ──────────┐                     │
                      ├──→ compliance ──→ pci-dss
iac-scan ─────────────┘                     │
                                            │
sbom ───────────────────────────────────────┤
                                            │
network-scan ───────────────────────────────┤
                                            │
runtime-scan ───────────────────────────────┘
                                            │
                          ┌─────────────────┘
                          │
                      findings store
                     (UnifiedFinding)
                          │
              ┌───────────┼───────────┐
              │           │           │
           rbac     multitenancy    payments
              │           │           │
              └───────────┼───────────┘
                          │
                     project model
```

Dependencies:
- **compliance** depends on **cloud-scan** OR **iac-scan** OR **code-scan** (needs findings from at least one scan source)
- **pci-dss** depends on **compliance**
- All scan pipelines depend on **project model** (from Phase 8B)
- All scan pipelines depend on **rbac** (permissions)
- **payments** gates which modules are available per plan

---

## 9. Deployment Model Mapping

| Module | SaaS | Self-Hosted | Hybrid |
|--------|------|-------------|--------|
| code-scan | Customer repo cloned in DP container | On-prem DP container | Customer infra DP |
| cloud-scan | Cloud creds encrypted in platform | Customer cloud creds on-prem | Customer infra DP |
| compliance | Control Plane reads findings | All on-prem | CP reads findings |
| pci-dss | CP manages ASV integration | On-prem internal scans only | CP for ASV import, DP for internal |
| network-scan | DP container scans targets | On-prem network reach | DP in customer VPC |
| sbom | DP container generates SBOM | On-prem DP | On-prem DP |
| runtime-scan | Agent sends to platform | Agent sends to on-prem | Agent → customer DP |
| iac-scan | Same as code-scan | Same as code-scan | Same as code-scan |
| rbac | Platform | Self-managed | Platform for CP |
| multitenancy | Platform | Self-managed | Platform for CP |
| payments | Stripe | License keys | Stripe + license keys |

---

## 10. Plan Tier Gating

| Module | Free | Pro | Enterprise |
|--------|------|-----|------------|
| code-scan | 3 scanners, no AI | All scanners + AI | All scanners + AI + custom rules |
| cloud-scan | - | AWS only | AWS + Azure + GCP |
| compliance | - | CIS only | All 43 frameworks |
| pci-dss | - | - | Full ASV integration + attestation |
| network-scan | - | - | Full |
| sbom | - | Basic (generate only) | Full (license scanning + vulnerability correlation) |
| runtime-scan | - | - | Full |
| iac-scan | - | Terraform + K8s | All IaC types + custom policies |
| ai-chat | - | Limited (100 msg/mo) | Unlimited |
| rbac | Viewer only | 3 roles | Custom roles + permissions |
| multitenancy | - | Single org | Multi-org + tenants |
| projects | 1 project | 10 projects | Unlimited |

---

## 11. API Routes Per Module

| Module | Routes |
|--------|--------|
| code-scan | `/v1/scans` (existing) |
| cloud-scan | `/v1/cloud-accounts`, `/v1/cloud-accounts/:id`, `/v1/cloud-scans`, `/v1/cloud-scans/:id`, `/v1/cloud-scans/:id/trigger`, `/v1/cloud-resources` |
| compliance | `/v1/compliance/frameworks`, `/v1/compliance/frameworks/:id/controls`, `/v1/compliance/mappings`, `/v1/compliance/reports`, `/v1/compliance/reports/:id/generate` |
| pci-dss | `/v1/pci-dss/scans`, `/v1/pci-dss/scans/:id`, `/v1/pci-dss/attestations`, `/v1/pci-dss/attestations/:id`, `/v1/pci-dss/asv-imports`, `/v1/pci-dss/requirements` |
| network-scan | `/v1/network-targets`, `/v1/network-targets/:id`, `/v1/network-scans`, `/v1/network-scans/:id`, `/v1/network-scans/:id/trigger`, `/v1/network-hosts` |
| sbom | `/v1/sbom`, `/v1/sbom/:id`, `/v1/sbom/:id/export?format=cyclonedx\|spdx`, `/v1/sbom/:id/vulnerabilities`, `/v1/sbom/:id/licenses` |
| runtime-scan | `/v1/runtime/events`, `/v1/runtime/rules`, `/v1/runtime/rules/:id`, `/v1/runtime/agents`, `/v1/runtime/agents/:id` |
| iac-scan | `/v1/iac-scans`, `/v1/iac-scans/:id`, `/v1/iac-scans/:id/trigger`, `/v1/policies/rules` (custom Rego) |

---

## 12. UI Navigation Per Module

Each module adds a section to the sidebar when enabled:

| Module | Nav Item | Route |
|--------|----------|-------|
| code-scan | Scans | `/scans` |
| cloud-scan | Cloud Accounts | `/cloud/accounts`, `/cloud/scans` |
| compliance | Compliance | `/compliance/frameworks`, `/compliance/reports` |
| pci-dss | PCI DSS | `/pci-dss/attestations`, `/pci-dss/asv-imports` |
| network-scan | Network | `/network/targets`, `/network/scans` |
| sbom | SBOM | `/sbom`, `/sbom/:id` |
| runtime-scan | Runtime | `/runtime/events`, `/runtime/rules` |
| iac-scan | IaC | `/iac/scans`, `/iac/policies` |

---

## 13. Data Plane Images

| Image | Scanners/Tools | Size Est. |
|-------|----------------|-----------|
| `astra-code-scan` | Trivy, Semgrep, Gitleaks, Bearer, Checkov, Bandit | ~800MB |
| `astra-cloud-scan` | Prowler, ScoutSuite, kube-bench | ~500MB |
| `astra-pci-dss` | Prowler (PCI profile), OpenSCAP | ~600MB |
| `astra-network-scan` | Nmap, OpenVAS | ~1.2GB |
| `astra-sbom` | Syft, Grype, Trivy | ~400MB |
| `astra-runtime` | Falco, falcosidekick | ~300MB |
| `astra-compliance` | (Control Plane only — no separate image) | N/A |

---

## 14. Implementation Priority

### Phase 8 — Enterprise Architecture (RBAC, Projects, Multitenancy, Modules)
Already defined in TODO.md Phase 8A-8E.

### Phase 9 — Cloud Scan Pipeline
1. Cloud scan pipeline DAG (auth → discover → connect → scan → normalize → compliance_map → enrich → persist)
2. CloudAccount model + credentials management
3. Prowler integration (AWS/Azure/GCP)
4. ScoutSuite integration (AWS/Azure/GCP)
5. Cloud scan API routes + UI
6. Compliance mapping pipeline (ingest → map → score → report → persist)

### Phase 10 — Network Scan Pipeline
1. Network scan pipeline DAG
2. NetworkScanTarget model
3. Nmap integration
4. OpenVAS integration
5. Network scan API routes + UI

### Phase 11 — SBOM Pipeline
1. SBOM pipeline DAG
2. Syft + Grype integration
3. License conflict detection
4. Vulnerability correlation
5. SBOM API routes + UI (inventory, licenses, vulnerabilities)

### Phase 12 — PCI DSS Module
1. PCI DSS internal scanning (Prowler PCI profile)
2. ASV report import (Qualys, Rapid7, Tenable)
3. Attestation workflow
4. PCI DSS dashboard + API

### Phase 13 — Runtime Security
1. Falco agent deployment
2. Event collection via falcosidekick webhook
3. Runtime event detection + correlation
4. Alert dispatch

### Phase 14 — IaC Scan Pipeline
1. IaC scan pipeline DAG (separate from code-scan)
2. Checkov standalone integration
3. Custom Rego policy support
4. IaC scan API routes + UI

---

## 15. Open Questions

1. **Network scan targets**: Should we support scanning external IPs directly from SaaS, or require agents in the target network? Recommendation: from SaaS for external-facing assets; agent-based for internal.
2. **Falco agent management**: How do we deploy and manage Falco agents? Helm chart? DaemonSet? Agent versioning?
3. **ASV vendor priority**: Which ASV vendor to integrate first? Qualys has the largest market share.
4. **Compliance framework seeding**: How to keep compliance frameworks up-to-date? Bundled with release, or fetched from external source?
5. **Data Plane isolation**: Should each module's Data Plane be a separate Kubernetes deployment, or separate containers in the same pod?