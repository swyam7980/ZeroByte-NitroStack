import { BaseAgent } from "./base.agent.js";

/**
 * Verification Agent (§4, §9). The ONLY agent with authority to change a
 * finding's status. Calls the Verification module on Pentester MCP with a fresh
 * execution context per candidate. Deliberately has no memory of HOW the
 * original finding was produced — only the reproduction recipe — which keeps it
 * an independent check rather than a rubber stamp on the Recon & Exploitation
 * Agent's own output. The Gateway grants it ONLY the verification module (§11).
 */
export class VerificationAgent extends BaseAgent {
  readonly identity = "verification-agent";
  readonly allowedServers = ["pentester-mcp"];
  readonly allowedModules = ["verification"]; // ONLY verification, no discovery tools

  async run(_findingId: string): Promise<void> {
    // TODO: reproduce_finding (fresh context) → score_confidence → verdict
    throw new Error("not implemented");
  }
}
