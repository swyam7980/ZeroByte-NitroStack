import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "node:http";
import type { ScanProgress } from "../agents/orchestrator.agent.js";

/**
 * WebSocket gateway (§6). Streams live finding/status updates to the frontend
 * as each pipeline stage completes (§5) — not just at the end.
 */
export class WsGateway {
  private wss: WebSocketServer;
  private clients = new Set<WebSocket>();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ server, path: "/ws" });
    this.wss.on("connection", (ws) => {
      this.clients.add(ws);
      ws.on("close", () => this.clients.delete(ws));
    });
  }

  broadcast(jobId: string, progress: ScanProgress): void {
    const msg = JSON.stringify({ jobId, ...progress });
    for (const ws of this.clients) {
      if (ws.readyState === WebSocket.OPEN) ws.send(msg);
    }
  }
}
