# Astra Security Platform — Architecture Diagrams

Complete visual documentation of the Astra platform architecture.

| # | Diagram | Description |
|---|---------|-------------|
| 01 | [Architecture Overview](01-architecture-overview.md) | High-level system architecture with all components |
| 02 | [Data Plane Flow](02-data-plane-flow.md) | Hyper-granular scanner execution pipeline (15 steps) |
| 03 | [Control Plane Flow](03-control-plane-flow.md) | Findings ingestion, triage, routing, and SLA pipeline |
| 04 | [Technology Stack](04-technology-stack.md) | Full stack diagram with rationale and language support matrix |
| 05 | [Deployment Modes](05-deployment-modes.md) | SaaS, Self-hosted, Hybrid with docker-compose examples |
| 06 | [CI Integration](06-ci-integration.md) | GitHub Actions, GitLab CI, Jenkins integration flows |
| 07 | [AI Pipeline](07-ai-pipeline.md) | Two-layer AI scanning with prompt engineering and chunking |
| 08 | [Security Model](08-security-model.md) | Zero-trust architecture, data flow, auth, audit logging |

---

## How to View Mermaid Diagrams

These diagrams use Mermaid syntax. View them with:
- **GitHub**: Renders natively in Markdown files
- **VS Code**: Install "Markdown Preview Mermaid Support" extension
- **Browser**: Use [Mermaid Live Editor](https://mermaid.live)
- **CLI**: `npx @mermaid-js/mermaid-cli -i diagram.md -o diagram.svg`
