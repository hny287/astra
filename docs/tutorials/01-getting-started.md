# Getting Started with Astra

**Last updated:** 2026-05-15 | **Version:** v2.23.0

This tutorial walks you through setting up Astra Security Platform and running your first security scan. By the end, you'll have a working installation and understand the basic workflow.

---

## Prerequisites

Before you begin, ensure you have:

- **Node.js 20+** installed (`node --version`)
- **PostgreSQL 14+** running locally or accessible via connection string
- **npm** or **pnpm** package manager
- **Git** for cloning repositories

Optional but recommended:
- API keys for AI providers (OpenAI, Anthropic, or Ollama)
- GitHub Personal Access Token for scanning private repositories

---

## Step 1: Install Dependencies

```bash
# Clone the repository (if you haven't already)
git clone https://github.com/your-org/astra.git
cd astra

# Install all dependencies
npm install
```

---

## Step 2: Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env.local
```

Edit `.env.local` and set the required variables:

```bash
# Required
DATABASE_URL="postgresql://user:password@localhost:5432/astra?schema=public"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# Optional (AI Providers)
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."
OLLAMA_HOST="http://localhost:11434"

# Optional (GitHub Integration)
GITHUB_PAT="ghp_..."
```

Generate a secure `NEXTAUTH_SECRET`:

```bash
openssl rand -base64 32
```

---

## Step 3: Set Up the Database

```bash
# Run database migrations
npx prisma migrate deploy

# Seed the database with default users and configuration
npx prisma db seed
```

The seed script creates three default users:

| Email | Password | Role |
|-------|----------|------|
| `admin@astra.dev` | `admin123` | ADMIN |
| `analyst@astra.dev` | `analyst123` | ANALYST |
| `viewer@astra.dev` | `viewer123` | VIEWER |

---

## Step 4: Start the Development Server

```bash
npm run dev
```

The application will start on [http://localhost:3000](http://localhost:3000).

---

## Step 5: Sign In

1. Navigate to [http://localhost:3000](http://localhost:3000)
2. Click **Sign In** in the top-right corner
3. Enter your credentials (use the admin account for full access)
4. You'll be redirected to the main dashboard

---

## Step 6: Configure AI Providers

Before running scans, configure at least one AI provider:

1. Click your avatar in the top-right → **Settings**
2. Navigate to **AI Providers**
3. Select a provider (e.g., Anthropic, OpenAI, or Ollama)
4. Enter your API key
5. Click **Test Connection** to verify

Astra supports multiple providers:
- **Cloud Ollama** (api.ohmyllama.com)
- **Hosted Ollama** (self-hosted)
- **OpenAI** (GPT-4o, o3, o4-mini)
- **Anthropic** (Claude 4 Opus/Sonnet)
- **AWS Bedrock** (Claude via Bedrock)
- **Azure AI Foundry**
- **LangGraph** (graph workflows)

---

## Step 7: Run Your First Scan

### Option A: Scan a GitHub Repository

1. Click **New Scan** in the sidebar
2. Enter a repository URL (e.g., `https://github.com/owner/repo`)
3. Select a branch (default: `main`)
4. Optionally configure scan settings:
   - **Severity filters** (CRITICAL, HIGH, MEDIUM, LOW, INFO)
   - **Ignore patterns** (files/directories to skip)
   - **AI model selection** per pipeline stage
5. Click **Start Scan**

### Option B: Scan a Local Directory

1. Click **New Scan** → **Local Directory**
2. Browse to select a folder on your filesystem
3. Configure scan settings as above
4. Click **Start Scan**

---

## Step 8: Monitor Scan Progress

The scan runs through a 9-stage pipeline:

```
Clone → Discover → Git Ingest → Git Diagram → Tool Scan → Deep Scan → Cross-File → Aggregate → Persist
```

Each stage runs independently with its own AI model and configuration. You can monitor progress in real-time:

1. Navigate to **Scans** in the sidebar
2. Click on your running scan
3. View the **Pipeline Progress** visualization
4. Click individual stages to see detailed logs

A typical scan takes 5-30 minutes depending on repository size and scan depth.

---

## Step 9: Review Findings

Once the scan completes:

1. Navigate to the scan detail page
2. Click the **Findings** tab
3. Filter by severity, category, or status
4. Click individual findings to see:
   - File location and line numbers
   - Code snippet
   - AI-generated explanation
   - Suggested remediation
   - CWE and OWASP classifications

---

## Step 10: Triage and Assign

For each finding:

1. Review the AI analysis
2. Change status: **OPEN** → **CONFIRMED** or **FALSE_POSITIVE**
3. Assign to a team member for remediation
4. Add comments to document your analysis
5. Create a linked **Task** for tracking remediation

---

## What's Next?

Now that you've run your first scan, explore these topics:

- **[Understanding the Scan Pipeline](./02-scan-pipeline.md)** — Deep dive into each pipeline stage
- **[Triaging Findings](./03-triaging-findings.md)** — Learn the complete triage workflow
- **[Using AI Chat](./04-ai-chat.md)** — Chat with your scans and findings
- **[Configuring AI Providers](./05-provider-config.md)** — Advanced provider setup

---

## Troubleshooting

### Database Connection Errors

```
Error: Can't reach database server at `localhost:5432`
```

**Solution:** Ensure PostgreSQL is running:
```bash
# macOS (Homebrew)
brew services start postgresql@14

# Linux (systemd)
sudo systemctl start postgresql

# Docker
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password postgres:14
```

### AI Provider Connection Failed

```
Error: Failed to connect to provider
```

**Solution:**
1. Verify API key is correct
2. Check network connectivity
3. For Ollama, ensure the service is running: `ollama serve`
4. Test with `curl` or the provider's dashboard

### Scan Stuck on PENDING

**Solution:**
1. Check worker process is running (restart the dev server)
2. Verify database migrations completed
3. Check logs: `logs/worker.log` or console output

---

## See Also

- [Installation Guide](../how-to/installation.md)
- [Scan Configuration Reference](../reference/config/scan.md)
- [Pipeline Architecture](../explanation/architecture/pipeline.md)
