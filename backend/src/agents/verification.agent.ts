import { BaseAgent } from "./base.agent.js";
import type { Finding } from "@zerobyte/shared";

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

  constructor(mcp: ConstructorParameters<typeof BaseAgent>[0]) {
    super(mcp);
  }

  async run(finding: Finding): Promise<Finding> {
    const reproduced = await this.call<{
      verdict: "confirmed" | "inconclusive" | "false_positive";
      confidence: number;
      transcript: string;
    }>("pentester-mcp", "reproduce_finding", { findingId: finding.id });
    const score = await this.call<{ confidence: number }>("pentester-mcp", "score_confidence", {
      findingId: finding.id,
      reproductionSuccess: reproduced.verdict === "confirmed",
      signalStrength: reproduced.confidence,
      sourceAgreement: finding.evidence?.length ? 1 : 0.5,
    });

    const finalVerdict =
      reproduced.verdict === "confirmed" || (reproduced.verdict === "inconclusive" && score.confidence >= 0.6)
        ? "confirmed"
        : "false_positive";

    if (finalVerdict === "false_positive") {
      await this.call("pentester-mcp", "mark_false_positive", {
        findingId: finding.id,
        reason: "fresh-context replay did not reproduce the signal with enough confidence",
      });
    }

    return {
      ...finding,
      status: finalVerdict === "confirmed" ? "confirmed" : "unconfirmed",
      verdict: finalVerdict,
      confidence: score.confidence,
      verifiedAt: new Date().toISOString(),
      verificationTranscript: reproduced.transcript,
    };
  }
}
