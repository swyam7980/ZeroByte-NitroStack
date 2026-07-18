# ZeroByte Integration Guide

This document explains how to connect the current codespace into a working
end-to-end system.

It is written for this repository specifically:

- Frontend: `frontend/`
- Backend API + WS gateway + scan queue: `backend/`
- Pentester MCP server: `servers/pentester-mcp/`
- Reporting MCP server: `servers/reporting-mcp/`
- Shared schemas, scope loader, attack graph: `packages/shared/`
- Scope guard / common server utilities: `packages/server-kit/`
- Tool runners and containers: `runners/`
- Scope source of truth: `scope.yaml`

The project is not yet fully wired. The frontend shell is in place, the backend
and MCP servers are scaffolded, and the shared contracts exist. The missing
work is the actual orchestration path:

`Frontend -> Backend -> MCP client -> Pentester MCP -> Verification -> Reporting MCP -> Backend -> Frontend`

---

## 1. What Exists Right Now

### Frontend

The frontend already has the operator workflow:

- Dashboard for scan status and findings
- New Scan page for target + profile selection
- Findings page for triage
- Reports page for the final report
- Settings page for scope and defaults

Relevant files:

- `frontend/src/App.tsx`
- `frontend/src/lib/store.tsx`
- `frontend/src/api.ts`
- `frontend/src/ws.ts`
- `frontend/src/pages/*.tsx`
- `frontend/src/components/*.tsx`
- `frontend/src/types.ts`

The frontend expects:

- `POST /api/scans` to start a scan
- `GET /api/scans` to list scans
- `GET /api/scans/:id` to fetch a scan
- `GET /api/scans/:id/report` to fetch the final report
- `WS /ws` to stream scan progress events

The frontend also has a demo fallback in the store, so the UI stays populated
even when the backend is unavailable.

### Backend

The backend has the right shape but the real orchestration is still a stub.

Relevant files:

- `backend/src/index.ts`
- `backend/src/api/scan.routes.ts`
- `backend/src/ws/gateway.ts`
- `backend/src/queue/scan-queue.ts`
- `backend/src/mcp/client.ts`
- `backend/src/agents/orchestrator.agent.ts`
- `backend/src/agents/recon-exploitation.agent.ts`
- `backend/src/agents/verification.agent.ts`
- `backend/src/agents/reporting.agent.ts`

What it already does:

- loads `scope.yaml`
- creates an in-memory attack graph
- exposes REST routes
- opens a WebSocket server

What is missing:

- queue execution
- real MCP calls
- agent sequencing
- persistence of scan state and report state

### MCP servers

Both MCP servers have their module boundaries defined.

Pentester MCP modules:

- Recon
- Browser
- Scan
- Secrets
- Verification

Reporting MCP modules:

- Report

Relevant files:

- `servers/pentester-mcp/src/app.module.ts`
- `servers/pentester-mcp/src/modules/*`
- `servers/reporting-mcp/src/app.module.ts`
- `servers/reporting-mcp/src/modules/report/*`

### Shared contracts

The shared package already defines the data model that should flow through the
system:

- `packages/shared/src/schemas/finding.ts`
- `packages/shared/src/schemas/attack-graph.ts`
- `packages/shared/src/schemas/scope.ts`
- `packages/shared/src/attack-graph/store.ts`
- `packages/shared/src/scope/guard.ts`

This is the key to making the whole stack coherent: every layer should use the
same finding, scope, and attack graph shapes.

---

## 2. The Actual Runtime Contract

The project should behave like a pipeline, not like separate apps.

### End-to-end flow

1. Operator submits a scan from the frontend.
2. Backend validates and enqueues the request.
3. Backend opens one MCP session for that scan.
4. Orchestrator Agent sequences the scan.
5. Recon + Exploitation Agent produces candidate findings.
6. Verification Agent independently reproduces candidates.
7. Reporting Agent compiles only confirmed findings.
8. Backend streams progress and stores scan state.
9. Frontend renders live state, triage, and report.

### Core rule

Only the backend coordinates the scan lifecycle.

The frontend never talks to MCP servers directly.
The MCP servers never talk to the frontend directly.
The agents never own business state. They operate through the MCP client and the
Attack Graph store.

---

## 3. What Each Layer Should Own

### Frontend responsibilities

The frontend should only do operator-facing work:

- accept target and profile input
- show live progress
- list findings
- render the final report
- expose settings for scope and defaults

It should not:

- run any scanning logic
- make direct MCP calls
- decide verification or report logic

### Backend responsibilities

The backend is the control plane for a scan session.

It should:

- validate scan requests
- create a scan job
- open the MCP client/session
- run the orchestrator
- stream progress events to the WebSocket gateway
- persist job state
- fetch the final report from Reporting MCP

### Pentester MCP responsibilities

Pentester MCP owns everything that touches a live target:

- recon
- browser automation
- active scanning
- secret detection
- verification

### Reporting MCP responsibilities

Reporting MCP only transforms verified data into a deliverable:

- report compilation
- evidence attachment
- severity scoring
- Markdown export
- HTML export

### Shared package responsibilities

The shared package is the contract layer:

- Zod schemas
- scope loading and checking
- attack graph storage
- schema types for findings and assets

---

## 4. Recommended Integration Order

This is the order I would implement it in.

### Step 1: Make the backend queue real

Start with `backend/src/queue/scan-queue.ts`.

Implement:

- `enqueue(target, onProgress)`
- job creation
- job status transitions
- in-memory progress updates
- error handling

This is the first seam because every scan starts here.

### Step 2: Make the MCP client real

Implement `backend/src/mcp/client.ts`.

It should:

- open a session with the NitroStack gateway
- call tools by server + module + tool name
- pass requester identity on every call
- include scan session context
- list available tools from registry if needed

This is the transport layer between backend and the MCP servers.

### Step 3: Wire the orchestrator

Implement `backend/src/agents/orchestrator.agent.ts`.

It should:

- own the scan lifecycle
- call the recon/exploitation agent
- dispatch candidates to verification
- hand confirmed findings to reporting
- emit progress updates to the queue

### Step 4: Implement the three working agents

Implement:

- `backend/src/agents/recon-exploitation.agent.ts`
- `backend/src/agents/verification.agent.ts`
- `backend/src/agents/reporting.agent.ts`

Each agent should only call the modules it is allowed to reach.

### Step 5: Implement the Pentester MCP tools

Start with the minimum useful tool path:

- recon: resolve target, enumerate subdomains, fingerprint stack, crawl sitemap
- scan: nuclei and sqlmap
- secrets: gitleaks and response-body scanning
- verification: reproduce finding and score confidence

### Step 6: Implement the Reporting MCP tools

At minimum:

- compile_report
- export_markdown
- export_html

### Step 7: Connect attack graph updates

Use `packages/shared/src/attack-graph/store.ts` as the canonical backend state
store, or replace it with a real persistence layer later.

The important part is that every tool result becomes a graph update.

### Step 8: Make the frontend consume real data

The frontend store already expects:

- live WS progress frames
- scan object updates
- aggregated findings
- final report data

Once the backend emits those, the frontend should work with minimal change.

---

## 5. The Data Model You Should Preserve

Do not let each layer invent its own shape.

### Shared entities

Use these consistently:

- `Finding`
- `CandidateFinding`
- `Verdict`
- `Asset`
- `AttackGraphNode`
- `AttackGraphEdge`
- `ScopeConfig`

### Minimal lifecycle for a finding

1. `candidate`
2. `verifying`
3. `confirmed` or `unconfirmed`

### Progress event lifecycle

Use `ProgressEvent` to keep the frontend live:

- `stage`
- `message`
- optional `kind`
- optional `finding`
- optional `status`
- optional `surface`
- optional `progress`
- optional `phase`

That is the event shape the frontend store already understands.

---

## 6. How The Scope System Should Work

`scope.yaml` is the hard boundary for live-target access.

### Scope flow

1. Backend loads `scope.yaml`
2. `ScopeGuard` validates the target
3. Pentester MCP tool guards re-check the target
4. Any out-of-scope target fails before the tool body runs

Relevant files:

- `scope.yaml`
- `packages/shared/src/scope/loader.ts`
- `packages/shared/src/scope/guard.ts`
- `packages/server-kit/src/scope-check.guard.ts`

### Rules

- out-of-scope must override in-scope
- the check must happen before any live request
- verification should replay the recorded recipe, not trust the original tool output

This is the main safety boundary in the system.

---

## 7. How The Attack Graph Should Be Used

The attack graph is the shared memory of the project.

### Write path

Recon, scan, secrets, and verification should write nodes and edges as they run.

### Read path

Reporting only reads confirmed findings.

### Why this matters

It gives you:

- auditability
- a single source of truth
- separation between discovery and reporting
- a clear handoff between agents

If you keep the attack graph current, every other subsystem becomes simpler.

---

## 8. The Recommended Request/Response Path

### From the frontend

`POST /api/scans` should accept:

- `target`
- `profile`
- optional auth context
- optional scope reference

The backend should return a job object immediately, then continue work
asynchronously.

### During the scan

Backend should publish WebSocket events to `/ws`.

These events should drive:

- dashboard progress
- agent activity stream
- findings table
- live risk score

### At completion

The backend should:

- mark the job complete
- store the final report payload
- serve it from `GET /api/scans/:id/report`

---

## 9. What Is Missing In The Current Codespace

This is the honest status of the repo right now.

### Still stubbed

- backend queue execution
- MCP client transport
- orchestrator scan flow
- recon/exploitation agent logic
- verification agent logic
- reporting agent logic
- all Pentester MCP tool bodies
- all Reporting MCP tool bodies

### Already present

- frontend shell
- API routes
- WebSocket gateway
- scope schema
- attack graph schema
- module boundaries
- tool declarations

So the next phase is not "build a UI". It is "wire the control plane."

---

## 10. Practical Build Plan

If you want the shortest path to a demoable result, do this:

### Phase A: Minimum working pipeline

1. Implement `scan-queue.enqueue`
2. Implement `McpClient.call`
3. Implement orchestrator run loop
4. Stub recon/scanner/verification/reporting tool bodies to return deterministic data
5. Broadcast progress events through WS
6. Let the frontend render those events

This gives you a full visible flow even before real tools are connected.

### Phase B: Real discovery tools

1. Wire recon tools
2. Wire browser tools
3. Wire nuclei/sqlmap/gitleaks wrappers
4. Normalize tool output into candidate findings

### Phase C: Verification and reporting

1. Add fresh-context verification
2. Store verdicts in the attack graph
3. Compile confirmed findings only
4. Export Markdown/HTML report

### Phase D: Persistence and hardening

1. Replace in-memory job/graph storage
2. Add retries and timeout handling
3. Add auth and session isolation
4. Add audit logs and artifact storage

---

## 11. Suggested Implementation Shape

### Backend queue

`ScanQueue.enqueue()` should:

- create a job ID
- set status to `queued` then `running`
- create an MCP session
- instantiate the orchestrator
- push progress into WS
- catch failure and mark the job failed

### MCP client

`McpClient.call()` should:

- send `server`
- send `tool`
- send `args`
- send `requester`
- send `scanSessionId`
- send auth/session context

### Orchestrator

`OrchestratorAgent.runScan()` should follow this order:

1. recon and asset discovery
2. browser session and captured evidence
3. active scan tools
4. secret scanning
5. candidate verification
6. report compilation

### Verification agent

It should never reuse state from the discovery run.

It should:

- take a finding ID
- reconstruct the recipe
- reproduce it in a fresh context
- set confirmed/unconfirmed
- write back confidence and transcript

### Reporting agent

It should:

- fetch confirmed findings
- group by severity and asset
- generate Markdown first
- render HTML from the Markdown model

---

## 12. How The Frontend Should Consume The Result

The frontend already has the right sections:

- Dashboard for current run
- Findings for triage
- Reports for the final output

When the backend is working, the UI should display:

- current target
- scan phase
- progress percentage
- live agent activity
- severity counts
- risk score
- confirmed findings only in reports

If the backend is down, the demo mode can still show the workflow, but the real
goal is for the live WS stream to replace the demo stream transparently.

---

## 13. Final Target Architecture

The completed system should look like this:

```text
Operator
  -> Frontend
  -> Backend REST/WS gateway
  -> Scan queue
  -> Orchestrator agent
  -> Pentester MCP
       -> Recon tools
       -> Browser tools
       -> Scan tools
       -> Secrets tools
       -> Verification tools
  -> Attack graph store
  -> Reporting MCP
  -> Final report
  -> Frontend
```

That is the loop you need to finish.

---

## 14. Best Next Commit Sequence

If I were continuing this repository, I would commit in this order:

1. Backend queue and job lifecycle
2. MCP client transport
3. Orchestrator scan sequence
4. Recon tool implementations
5. Scan and secrets tool implementations
6. Verification tool implementations
7. Reporting tool implementations
8. Frontend live consumption of real backend output

This minimizes integration risk because every layer gets a working dependency
before the next layer is built on top of it.

