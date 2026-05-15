# CVSS Scoring

**Last updated:** 2026-05-15 | **Version:** v2.23.0

How Astra calculates CVSS v3.1 scores for vulnerabilities.

---

## Overview

CVSS (Common Vulnerability Scoring System) v3.1 provides a standardized way to rate vulnerability severity on a scale of 0.0–10.0.

---

## CVSS Components

### Base Metrics

| Metric | Description | Values |
|--------|-------------|--------|
| **Attack Vector (AV)** | How the vulnerability is exploited | Network (N), Adjacent (A), Local (L), Physical (P) |
| **Attack Complexity (AC)** | Conditions beyond attacker's control | Low (L), High (H) |
| **Privileges Required (PR)** | Access level needed | None (N), Low (L), High (H) |
| **User Interaction (UI)** | User participation required | None (N), Required (R) |
| **Scope (S)** | Impact beyond vulnerable component | Unchanged (U), Changed (C) |
| **Confidentiality (C)** | Data disclosure impact | None (N), Low (L), High (H) |
| **Integrity (I)** | Data modification impact | None (N), Low (L), High (H) |
| **Availability (A)** | Service disruption impact | None (N), Low (L), High (H) |

---

## Astra's CVSS Calculation

### AI-Generated Vectors

Astra's AI analyzes each vulnerability and generates a CVSS vector:

```
CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H
```

### Example Breakdown

```
CVSS:3.1                    # Version
AV:N  - Attack Vector: Network (remotely exploitable)
AC:L  - Attack Complexity: Low (easy to exploit)
PR:N  - Privileges Required: None (no auth needed)
UI:N  - User Interaction: None (no user action)
S:U   - Scope: Unchanged (impact limited to vulnerable component)
C:H   - Confidentiality: High (full data disclosure)
I:H   - Integrity: High (complete system compromise)
A:H   - Availability: High (total service disruption)
```

**Score:** 9.8 (CRITICAL)

---

## Severity Mapping

| CVSS Score | Severity | SLA |
|------------|----------|-----|
| 9.0–10.0 | CRITICAL | 4 hours |
| 7.0–8.9 | HIGH | 24 hours |
| 4.0–6.9 | MEDIUM | 72 hours |
| 0.1–3.9 | LOW | 7 days |
| 0.0 | INFO | N/A |

---

## AI Scoring Process

### Step 1: Analyze Vulnerability

The AI examines:
- Code context
- Exploitation scenario
- Potential impact
- Required conditions

### Step 2: Determine Metrics

For each CVSS metric, AI selects the appropriate value:

```typescript
// Example: SQL Injection in public API
{
  attackVector: 'N',      // Exploitable over network
  attackComplexity: 'L',  // No special conditions
  privilegesRequired: 'N',// Public endpoint
  userInteraction: 'N',   // No user action needed
  scope: 'U',             // Impact limited to database
  confidentiality: 'H',   // Full data access
  integrity: 'H',         // Can modify any data
  availability: 'N'       // No DoS
}
```

### Step 3: Calculate Score

Using CVSS v3.1 formulas:

```
Impact Sub-Score = 1 - [(1-ConfImpact) × (1-IntegImpact) × (1-AvailImpact)]

If Scope is Unchanged:
  Base Score = min[(Impact + Exploitability), 10]

If Scope is Changed:
  Base Score = min[7.52 × (Impact - 0.029) - 3.25 × (Impact - 0.02)^15, 10]
```

---

## Example Scores

### SQL Injection (Public API)

```
Vector: CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N
Score: 9.1 (CRITICAL)
```

### XSS (Reflected, Authenticated)

```
Vector: CVSS:3.1/AV:N/AC:L/PR:L/UI:R/S:U/C:L/I:L/A:N
Score: 5.4 (MEDIUM)
```

### Hardcoded API Key

```
Vector: CVSS:3.1/AV:L/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N
Score: 5.3 (MEDIUM)
```

### Authentication Bypass

```
Vector: CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H
Score: 10.0 (CRITICAL)
```

---

## Exploit Score

Astra also calculates an **Exploit Score** (0.0–1.0) representing likelihood of exploitation:

| Factor | Weight |
|--------|--------|
| Public exploit available | +0.3 |
| Active exploitation in wild | +0.3 |
| Low complexity | +0.2 |
| No authentication | +0.2 |

**Example:**
```
SQL Injection with public exploit:
Base: 0.5 + 0.3 (exploit) + 0.2 (low complexity) = 1.0
```

---

## CVSS in Findings

Each finding includes:

```json
{
  "cvssScore": 9.1,
  "cvssVector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N",
  "exploitScore": 0.94,
  "exploitationScenario": "An attacker could send a crafted POST request..."
}
```

---

## Limitations

### AI Scoring Accuracy

- AI-generated scores are estimates
- Manual verification recommended for CRITICAL findings
- Scores may differ from NVD ratings

### Context Awareness

CVSS doesn't capture:
- Business context
- Compensating controls
- Deployment environment

Astra supplements with:
- Business impact analysis
- Exploitability assessment
- Remediation priority

---

## See Also

- [Finding Schema](../../reference/schema/finding.md)
- [Triaging Findings Tutorial](../../tutorials/03-triaging-findings.md)
- [CVSS v3.1 Specification](https://www.first.org/cvss/specification-document)
