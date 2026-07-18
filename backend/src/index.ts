import "dotenv/config";
import { createServer } from "node:http";
import express from "express";
import { AttackGraphStore, loadScope, ScopeGuard } from "@zerobyte/shared";
import { scanRoutes } from "./api/scan.routes.js";
import { WsGateway } from "./ws/gateway.js";
import { AuthService } from "./auth/auth.service.js";
import { ScanQueue } from "./queue/scan-queue.js";

/**
 * Backend entry point (§1). REST/WS gateway + job queue + auth. Wires the
 * shared attack-graph store, scope guard, and scan queue, then serves the API.
 */
function main(): void {
  const PORT = Number(process.env.PORT ?? 4000);
  const scope = loadScope(process.env.SCOPE_FILE ?? "./scope.yaml");
  const scopeGuard = new ScopeGuard(scope);
  const graph = new AttackGraphStore();
  const auth = new AuthService(process.env.JWT_SECRET ?? "dev", process.env.JWT_EXPIRY ?? "1h");

  // TODO: build OrchestratorAgent factory (McpClient + sub-agents) per scan session.
  const queue = new ScanQueue(() => { throw new Error("orchestrator factory not implemented"); });

  const app = express();
  app.use(express.json());
  app.get("/health", (_req, res) => res.json({ ok: true, scope: scope.scan_session.name }));
  app.get("/nitrochat", (_req, res) => {
    res.redirect(process.env.FRONTEND_URL ?? "http://127.0.0.1:3000/nitrochat");
  });
  app.use("/api", scanRoutes(queue));

  const server = createServer(app);
  const ws = new WsGateway(server);

  // Keep references reachable for the wiring TODOs above.
  void scopeGuard; void graph; void auth; void ws;

  server.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[backend] listening on :${PORT} — scope: ${scope.scan_session.name}`);
  });
}

main();
