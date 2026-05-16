# Adding or Updating Pipeline Nodes & Scanner Tools

**Location:** `docs/how-to/add-or-update-node-or-tool.md`

This is the definitive step-by-step guide for modifying the scan pipeline. It covers four operations:

| Operation | Steps | Key Files |
|---|---|---|
| **Add new node** | 16 | `state.ts`, `worker.ts` (4 edits), `queue.ts`, `config.ts` (3 edits), `factory.ts`, `nodes/<name>.ts` (new), `rerun-node/route.ts` (2 edits), `ScanProgress.tsx`, `pipeline/page.tsx` (3 edits), `changelog.ts`, `CLAUDE.md` |
| **Add new scanner** | 10 | `nodes/tool-scan.ts` (types + normalizer + runner + call site), `rerun-node/route.ts`, `Dockerfile`, `changelog.ts`, `CLAUDE.md` |
| **Update node** | 7 | `nodes/<name>.ts`, optionally `state.ts`, `worker.ts`, `config.ts` |
| **Update scanner** | 5 | `nodes/tool-scan.ts`, optionally `rerun-node/route.ts` |

## Pipeline Architecture

```
clone → discover → git_ingest → git_diagram → tool_scan → deep_scan → cross_file → aggregate → persist
```

Each node is a function `(state: ScanState) => Promise<Partial<ScanState>>` registered in:
- `src/scan/queue.ts` — `NODE_PIPELINE` array (ordering)
- `src/scan/worker.ts` — `NODE_FNS` map (execution) + `reconstructState`/`mergeStateFromOutput` (state)
- `src/scan/state.ts` — `ScanState` interface (shape)
- `src/lib/config.ts` — Zod schema + defaults + `mergeNodeOverrides`
- `src/providers/factory.ts` — `createProviderForNode` union type (AI nodes only)

## Conventions

- **Never use `exec()`** — always `execFile()` with args array to prevent command injection
- **Populate every `UnifiedFinding` field** — no `undefined` values
- **Never mutate `state`** — return a `Partial<ScanState>` object
- **Always `await log()`** at start, on error, on completion
- **Wrap `prisma.nodeOutput.create`** in try/catch (non-critical)
- **Return `status: 'FAILED'`** only for fatal pipeline-stopping errors
- **Non-fatal errors** go to `errors[]` array, pipeline continues
- **Use imports from `branding.ts`** — never hardcode brand strings

## Verification Checklist (38 items)

Full checklist in the guide covering: build & lint, pipeline registration, rerun API, UI, node implementation, scanner tool, config/seed, and documentation.

## Quick File Reference

| Change | Files |
|---|---|
| New node | `state.ts`, `worker.ts`, `queue.ts`, `config.ts`, `factory.ts`, `nodes/<name>.ts`, `rerun-node/route.ts`, `ScanProgress.tsx`, `pipeline/page.tsx`, `changelog.ts`, `CLAUDE.md` |
| New scanner | `nodes/tool-scan.ts`, `rerun-node/route.ts`, `Dockerfile`, `changelog.ts`, `CLAUDE.md` |
| Update node | `nodes/<name>.ts`, maybe `state.ts`/`worker.ts`/`config.ts` |
| Update scanner | `nodes/tool-scan.ts`, maybe `rerun-node/route.ts` |