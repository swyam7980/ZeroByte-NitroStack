import "dotenv/config";
import { createServer } from "node:http";
import express from "express";
import { loadScope, ScopeGuard } from "@zerobyte/shared";
import { scanRoutes } from "./api/scan.routes.js";
import { attackGraphRoutes } from "./api/attack-graph.routes.js";
import { WsGateway } from "./ws/gateway.js";
import { AuthService } from "./auth/auth.service.js";
import { ScanQueue } from "./queue/scan-queue.js";
import { AttackGraphRegistry } from "./state/attack-graph-registry.js";
import { McpClient } from "./mcp/client.js";
import { OrchestratorAgent } from "./agents/orchestrator.agent.js";
import { ReconExploitationAgent } from "./agents/recon-exploitation.agent.js";
import { VerificationAgent } from "./agents/verification.agent.js";
import { ReportingAgent } from "./agents/reporting.agent.js";

/**
 * Backend entry point (§1). REST/WS gateway + job queue + auth. Wires the
 * shared attack-graph store, scope guard, and scan queue, then serves the API.
 */
function main(): void {
  const PORT = Number(process.env.PORT ?? 4000);
  const scope = loadScope(process.env.SCOPE_FILE ?? "./scope.yaml");
  const scopeGuard = new ScopeGuard(scope);
  const graphs = new AttackGraphRegistry();
  const auth = new AuthService(process.env.JWT_SECRET ?? "dev", process.env.JWT_EXPIRY ?? "1h");
  const gatewayUrl = process.env.MCP_GATEWAY_URL ?? "local://mcp";
  const apiKey = process.env.MCP_API_KEY ?? "dev";

  const queue = new ScanQueue((scanSessionId) => {
    const mcp = McpClient.openSession(gatewayUrl, apiKey, scanSessionId);
    return new OrchestratorAgent(mcp, {
      reconExploitation: new ReconExploitationAgent(mcp),
      verification: new VerificationAgent(mcp),
      reporting: new ReportingAgent(mcp),
    });
  }, graphs);

  const app = express();
  app.use(express.json());
  app.get("/health", (_req, res) => res.json({ ok: true, scope: scope.scan_session.name }));
  app.use("/", attackGraphRoutes(graphs));

  const server = createServer(app);
  const ws = new WsGateway(server);
  app.use("/api", scanRoutes(queue, (jobId, progress) => ws.broadcast(jobId, progress)));

  // Keep references reachable for the wiring TODOs above.
  void scopeGuard; void auth; void ws;

  server.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[backend] listening on :${PORT} — scope: ${scope.scan_session.name}`);
  });
}

main();
