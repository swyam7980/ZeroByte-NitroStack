# ZeroByte — Agentic Pentester (NitroStack)

MCP-first agentic penetration-testing system. **Two** MCP servers built on
[NitroStack](https://nitrostack.ai) (`@nitrostack/core`) expose every capability
as typed, scope-checked tools. Four thin agents sequence them; NitroStack is the
control plane (SDK + NitroStudio + NitroCloud).

> Full design: [`agentic-pentester-architecture.md`](./agentic-pentester-architecture.md)

## Layout

```
packages/
  shared               Schemas (finding, attack-graph, scope), AG store + client, scope guard
  server-kit           Shared NitroStack ScopeCheckGuard + AuditInterceptor
servers/
  pentester-mcp        "Touches a live target" — one server, five DI modules:
    modules/recon        resolve_target, enumerate_subdomains, fingerprint_stack, crawl_sitemap, list_open_endpoints
    modules/browser      open_session, navigate, execute_user_flow, capture_*, close_session  (Playwright)
    modules/scan         run_nuclei, run_sqlmap, run_port_scan  (Docker-sandboxed)
    modules/secrets      run_gitleaks, scan_response_bodies_for_secrets  (redaction-first)
    modules/verification reproduce_finding, score_confidence, mark_false_positive  (fresh context)
  reporting-mcp        "Transforms confirmed data" — privilege-free:
    modules/report       compile_report, attach_evidence, score_severity, export_markdown, export_html
backend/               REST + WS gateway, job queue, auth, MCP client, the 4 agents
frontend/              React dashboard: start scan, live finding feed, report view
runners/
  playwright/          Playwright driver process (Dockerized)
  tools/{nuclei,sqlmap,gitleaks}/   Per-tool sandbox images
scope.yaml             Single source of truth for in-scope targets + limits
```

## Two servers, split by risk

- **Pentester MCP** — everything that discovers, probes, or verifies. Five
  internally-separated NitroStack modules (own providers + guards) sharing one
  deployment. The Verification module keeps its **fresh-execution-context**
  guarantee via a dedicated factory, regardless of co-location.
- **Reporting MCP** — report compilation only, deliberately with none of the
  Docker/network/browser privileges, so it literally cannot reach a live target.

The two servers never call each other — they hand off through the backend-owned
Attack Graph store (Pentester writes; Reporting reads only `confirmed`).

## Four agents (all MCP clients)

`Orchestrator` → `Recon & Exploitation` (recon+browser+scan+secrets modules) →
`Verification` (verification module only) → `Reporting` (reporting-mcp only).
Gateway permissions enforce the module scoping, not just prompts.

## Data flow

```
FE → Backend (enqueue) → MCP session → Orchestrator
   → Recon&Exploitation (candidates) → Verification (verdicts) → Reporting
   → findings stream back to FE as each stage completes
```

## NitroStack shape

- `@McpApp` root + `McpApplicationFactory.create(AppModule).start()` bootstrap
- `@Module({ name, controllers, providers, exports })` per capability module
- `@Tool({ name, description, inputSchema })` methods, signature `(input, ctx)`
- `@Injectable()` services, constructor DI; `@UseGuards(ScopeCheckGuard)`
- Deployed as two NitroCloud projects: `pentester-mcp`, `reporting-mcp`

## MVP (per §13)

Pentester MCP (Recon + Scan/nuclei + Verification modules), Reporting MCP
(`compile_report` + `export_markdown`), all four agents on a linear pipeline,
`scope.yaml` guard on every Pentester module, minimal frontend.

## Getting started

```bash
cp .env.example .env
npm install
npm run typecheck
npm run dev:backend      # + dev:frontend, dev:servers
```

All tool bodies are stubs — signatures and Zod schemas are wired, bodies contain
`TODO` markers. Build inward from the schemas in `packages/shared`.
`@nitrostack/core` is referenced at `^0.1.0`; pin to the actual published
version at install time.
