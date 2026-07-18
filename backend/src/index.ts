import "dotenv/config";
import { createServer } from "node:http";
import express, { type Express } from "express";
import { AttackGraphStore, loadScope, ScopeGuard } from "@zerobyte/shared";
import { scanRoutes } from "./api/scan.routes.js";
import { WsGateway } from "./ws/gateway.js";
import { AuthService } from "./auth/auth.service.js";
import { ScanQueue } from "./queue/scan-queue.js";

/**
 * Build the Express app with all middleware and routes.
 * Shared between the Vercel serverless export and the local listen path.
 */
function buildApp(): { app: Express; queue: ScanQueue } {
  const scope = loadScope(process.env.SCOPE_FILE ?? "./scope.yaml");
  const queue = new ScanQueue(() => { throw new Error("orchestrator factory not implemented"); });
  const scopeGuard = new ScopeGuard(scope);
  const graph = new AttackGraphStore();
  const auth = new AuthService(process.env.JWT_SECRET ?? "dev", process.env.JWT_EXPIRY ?? "1h");

  const app = express();
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
