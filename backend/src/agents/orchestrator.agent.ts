import { BaseAgent } from "./base.agent.js";
import type { ReconExploitationAgent } from "./recon-exploitation.agent.js";
import type { VerificationAgent } from "./verification.agent.js";
import type { ReportingAgent } from "./reporting.agent.js";

export interface ScanProgress {
  stage: "recon" | "browser" | "scan" | "secrets" | "verify" | "report" | "complete";
  message: string;
}

/**
 * Orchestrator Agent (§4). Owns the scan lifecycle end-to-end. Sequences the
 * pipeline (recon → browser/scan → secrets → verification → report), retries
 * failed tool calls, and is the ONLY agent allowed to mark a scan complete.
 * Holds no direct scanning/reporting tool access itself — it delegates to the
 * other three agents.
 */
export class OrchestratorAgent extends BaseAgent {
  readonly identity = "orchestrator-agent";
  readonly allowedServers: string[] = []; // delegates; holds no direct tool access
  readonly allowedModules: string[] = [];

  constructor(
    mcp: ConstructorParameters<typeof BaseAgent>[0],
    private readonly agents: {
      reconExploitation: ReconExploitationAgent;
      verification: VerificationAgent;
      reporting: ReportingAgent;
    },
  ) {
    super(mcp);
  }

  /**
   * Drives the pipeline. `onProgress` streams stage updates so findings reach
   * the frontend as each stage completes, not just at the end (§5).
   *
   * Flow (§4, §5): assign asset → Recon & Exploitation surfaces candidates →
   * dispatch each candidate to Verification → hand confirmed findings to
   * Reporting → mark complete.
   */
  async runScan(_target: string, _onProgress: (p: ScanProgress) => void): Promise<void> {
    // TODO: reconExploitation.run(asset) → per-candidate verification.run(id) →
    //       reporting.run(scanSessionId); retry policy; mark complete.
    throw new Error("not implemented");
  }
}
