import type { Asset } from "../schemas/attack-graph.js";
import type { Finding, CandidateFinding, Verdict } from "../schemas/finding.js";

/**
 * Injected into every MCP server (§6). Servers use this to read what they need
 * and write results back. In the deployed system this is an HTTP client to the
 * backend-owned store; locally it can wrap AttackGraphStore directly.
 */
export interface AttackGraphClient {
  scanSessionId: string;

  addAsset(asset: Asset): Promise<void>;
  getAssets(): Promise<Asset[]>;

  addCandidate(c: CandidateFinding & { id: string; severity: Finding["severity"] }): Promise<void>;
  getCandidates(): Promise<Finding[]>;

  updateVerdict(findingId: string, verdict: Verdict, confidence: number, transcript?: string): Promise<void>;
  getConfirmed(): Promise<Finding[]>;
}
