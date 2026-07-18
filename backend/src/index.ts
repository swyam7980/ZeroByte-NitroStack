import "dotenv/config";
import { createServer } from "node:http";
import express, { type Express } from "express";
import cors from "cors";
import { AttackGraphStore, loadScope, ScopeGuard } from "@zerobyte/shared";
import type { ScopeConfig } from "@zerobyte/shared";
import { scanRoutes } from "./api/scan.routes.js";
import { WsGateway } from "./ws/gateway.js";
import { AuthService } from "./auth/auth.service.js";
import { ScanQueue } from "./queue/scan-queue.js";

/**
 * Load scope config gracefully — the scope.yaml file may not exist on
 * Vercel (serverless filesystem). Falls back to a permissive empty scope.
 */
function loadScopeSafe(): ScopeConfig {
  const path = process.env.SCOPE_FILE ?? "./scope.yaml";
  try {
    return loadScope(path);
  } catch {
    return {
      scan_session: { name: process.env.SCOPE_NAME ?? "vercel", description: "" },
      in_scope: { hosts: [], paths: [] },
      out_of_scope: { hosts: [], paths: [] },
      limits: { max_requests_per_second: 10, max_concurrent_sessions: 3, request_timeout_ms: 30000, scan_timeout_ms: 600000 },
      allowed_tools: {},
      network: { allow_egress_to_scope_only: true },
    } as ScopeConfig;
  }
}

/**
 * Build the Express app with all middleware and routes.
 * Shared between the Vercel serverless export and the local listen path.
 */
function buildApp(): { app: Express; queue: ScanQueue } {
  const scope = loadScopeSafe();
  const queue = new ScanQueue(() => { throw new Error("orchestrator factory not implemented"); });
  const scopeGuard = new ScopeGuard(scope);
  const graph = new AttackGraphStore();
  const auth = new AuthService(process.env.JWT_SECRET ?? "dev", process.env.JWT_EXPIRY ?? "1h");

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.get("/health", (_req, res) => res.json({ ok: true, scope: scope.scan_session.name }));
  app.get("/nitrochat", (_req, res) => {
    res.redirect(process.env.FRONTEND_URL ?? "http://127.0.0.1:3000/nitrochat");
  });
  app.use("/api", scanRoutes(queue));

  // Keep references reachable for wiring TODOs above.
  void scopeGuard; void graph; void auth;

  return { app, queue };
}

/**
 * Vercel serverless export.
 * Vercel's Express adapter picks up the `app` default export automatically
 * when "framework": "express" is set in vercel.json.
 */
const { app } = buildApp();
export default app;

// ── Local development only ──────────────────────────────────────────────
// When running directly (not on Vercel serverless), listen on a port.
const isVercel = process.env.VERCEL === "1";
if (!isVercel) {
  const PORT = Number(process.env.PORT ?? 4000);
  const server = createServer(app);
  const ws = new WsGateway(server);
  void ws;

  server.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[backend] listening on :${PORT}`);
  });
}
