/**
 * Playwright runner process (§7). Sits behind the Browser MCP server — the
 * server is the only thing that talks to this; agents never do. One isolated
 * browser context per session; CDP for network/console/heap; explicit teardown.
 *
 * Exposed to the Browser MCP over a local IPC/HTTP interface (TODO: pick one).
 */

export interface SessionHandle {
  sessionId: string;
}

export class PlaywrightRunner {
  // TODO: import { chromium } from "playwright"; manage a context map keyed by sessionId.

  async openSession(_target: string): Promise<SessionHandle> {
    // TODO: chromium.launch → newContext (isolated) → newPage → attach CDP session
    throw new Error("not implemented");
  }

  async navigate(_sessionId: string, _url: string): Promise<{ status: number; finalUrl: string }> {
    throw new Error("not implemented");
  }

  async closeSession(_sessionId: string): Promise<void> {
    throw new Error("not implemented");
  }
}

// TODO: start the local transport the Browser MCP connects to.
