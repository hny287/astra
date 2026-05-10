# Astra — AI Scanning Pipeline

## Two-Layer AI Architecture

```mermaid
flowchart TB
    subgraph INPUT["Input: Source Code Repository"]
        REPO["Repo Files\n.js .ts .py .go .java ..."]
    end
    
    subgraph LAYER1["Layer 1: Per-File Deep Scan"]
        direction TB
        WALK["File Walker\nEnumerate all code files\nSkip: node_modules, .git, vendor"]
        CHUNK["File Chunker\nSplit files > context window"]
        BATCH["Batch Processor\nGroup files by language"]
        
        subgraph PER_FILE["For Each File"]
            SEND["Send to AI:\nfile_path + content"]
            PROMPT1["Prompt:\n'Analyze this file for\nvulnerabilities, logic bugs,\nanti-patterns. Return:\nfindings + summary'"]
            AI1["AI Model\nOllama / Claude"]
            RESP1["Response:\n{ findings: [...],\n  summary: '...' }"]
            
            SEND --> PROMPT1 --> AI1 --> RESP1
        end
        
        WALK --> CHUNK --> BATCH --> PER_FILE
    end
    
    subgraph LAYER2["Layer 2: Cross-File Business Logic"]
        direction TB
        MAP["Build Codebase Map\nAggregate all file summaries\ninto structured graph"]
        PROMPT2["Prompt:\n'Given this codebase map,\nidentify cross-file issues:\n- Missing auth middleware\n- Privilege escalation paths\n- Broken access control\n- Data flow violations'"]
        AI2["AI Model\nOllama / Claude"]
        RESP2["Response:\n{ biz_logic_findings: [...] }"]
        
        MAP --> PROMPT2 --> AI2 --> RESP2
    end
    
    subgraph OUTPUT["Output: Enriched Findings"]
        TRAD["Traditional Scanner Findings\nSemgrep · Trivy · Gitleaks · Checkov"]
        AI_FINDINGS["AI Findings\nLayer 1 + Layer 2"]
        MERGE["Merge + Normalize\nUnified Finding Schema"]
        
        TRAD --> MERGE
        AI_FINDINGS --> MERGE
    end
    
    INPUT --> LAYER1
    LAYER1 --> LAYER2
    LAYER1 -->|"file_summaries"| MAP
    LAYER2 --> AI_FINDINGS
    LAYER1 -->|"layer_1_findings"| AI_FINDINGS
```

---

## AI Prompt Engineering

### Layer 1: Per-File Scan Prompt

```python
SYSTEM_PROMPT = """You are an expert application security engineer.
Analyze the provided source code file for vulnerabilities,
security anti-patterns, and logic bugs.

Focus on:
- SQL injection, XSS, command injection
- Authentication bypasses
- Insecure data handling
- Business logic flaws
- Missing input validation

For each finding, provide:
1. Title (concise)
2. Severity (critical/high/medium/low/info)
3. Category (injection/auth/secrets/etc)
4. Line numbers
5. Brief explanation
6. Suggested fix

Also provide a 2-3 sentence summary of the file's security posture."""

FILE_PROMPT = f"""File: {file_path}
Language: {language}

```
{code_content}
```

Respond in JSON format:
{{
  "findings": [
    {{
      "title": "...",
      "severity": "high",
      "category": "injection",
      "line_start": 42,
      "line_end": 48,
      "explanation": "...",
      "fix": "..."
    }}
  ],
  "summary": "This file handles user input but lacks validation..."
}}
"""
```

### Layer 2: Cross-File Business Logic Prompt

```python
SYSTEM_PROMPT = """You are an expert at analyzing application architecture
for security flaws that span multiple files.

Given a codebase map (file summaries, not raw code),
identify:
- Missing authentication/authorization middleware
- Privilege escalation paths
- Broken access control between routes
- Insecure data flows between components
- Race conditions in business logic
- Missing audit logging

For each finding, specify which files are involved."""

MAP_PROMPT = f"""Codebase Map:
{json.dumps(codebase_map, indent=2)}

Respond in JSON format:
{{
  "biz_logic_findings": [
    {{
      "title": "Missing auth on admin routes",
      "severity": "critical",
      "description": "Admin routes in admin.py lack middleware...",
      "affected_files": ["app/routes/admin.py", "app/middleware/auth.py"],
      "confidence": 0.92
    }}
  ]
}}
"""
```

---

## AI Provider Selection Logic

```mermaid
flowchart TD
    START(["Scan Request"]) --> CHECK{"AI Provider Config"}
    
    CHECK -->|"OLLAMA_URL set\n(local)"| LOCAL["Ollama Local\ndeepseek-coder:6.7b\nllama3:8b"]
    CHECK -->|"OLLAMA_API_KEY set\n(cloud)"| CLOUD["Ollama Cloud API\nSame models, hosted"]
    CHECK -->|"ANTHROPIC_API_KEY set"| CLAUDE["Anthropic Claude\nsonnet-4-6\nDeep scan"]
    CHECK -->|"OPENAI_API_KEY set"| GPT["OpenAI GPT\ngpt-4o\nDeep scan"]
    CHECK -->|"None set"| FALLBACK["Fallback:\nRule-based only\nNo AI enrichment"]
    
    LOCAL -->|"Per-file scan"| L1["Layer 1"]
    LOCAL -->|"Cross-file logic"| L2["Layer 2"]
    
    CLOUD -->|"Per-file scan"| L1
    CLOUD -->|"Cross-file logic"| L2
    
    CLAUDE -->|"Deep scan pass"| DEEP["Combined Layer 1+2\nLarger context window"]
    GPT -->|"Deep scan pass"| DEEP
    
    L1 --> MERGE["Merge Findings"]
    L2 --> MERGE
    DEEP --> MERGE
    FALLBACK --> MERGE
    
    MERGE --> END(["Normalized Output"])
    
    style LOCAL fill:#42be65,color:#fff
    style CLOUD fill:#4589ff,color:#fff
    style CLAUDE fill:#fa4d56,color:#fff
    style GPT fill:#08bdba,color:#fff
    style FALLBACK fill:#f1c21b,color:#161616
```

---

## Chunking Strategy

Large files exceed LLM context windows. Chunking splits them intelligently:

```mermaid
graph LR
    FILE["Large File\n(5000+ lines)"] --> SPLIT{"Split Strategy"}
    
    SPLIT -->|"Function-based"| FUNC["By function/class\nPreserve signatures"]
    SPLIT -->|"Line-based"| LINE["By line count\n500-line chunks\n50-line overlap"]
    SPLIT -->|"AST-based"| AST["By AST nodes\nLanguage-aware"]
    
    FUNC --> CONTEXT["Add Context:\n- File path\n- Imports\n- Class hierarchy\n- Previous chunk summary"]
    LINE --> CONTEXT
    AST --> CONTEXT
    
    CONTEXT --> AI["AI Scan\nPer chunk"]
    AI --> MERGE["Merge Results\nDeduplicate across chunks"]
```

### Chunking Configuration

```python
CHUNK_CONFIG = {
    "max_tokens_per_chunk": 4000,      # Leave room for response
    "overlap_lines": 50,                # Context between chunks
    "preserve_function_boundaries": True,
    "preserve_class_boundaries": True,
    "include_imports_in_every_chunk": True,
    "language_specific": {
        "python": {"split_on": ["def ", "class ", "async def "]},
        "javascript": {"split_on": ["function ", "const ", "class "]},
        "go": {"split_on": ["func ", "type "]},
    }
}
```
