import type { Asset } from "../schemas/attack-graph.js";
import type { Finding, CandidateFinding, Verdict } from "../schemas/finding.js";
import type { AttackGraphClient } from "./client.js";
import { AttackGraphStore } from "./store.js";

/**
 * In-process AttackGraphClient (§6). Wraps a local AttackGraphStore so a single
 * MCP server can run standalone — e.g. driven directly from NitroStudio during
 * development, with no backend store to talk to. Not shared across processes:
 * the deployed system uses HttpAttackGraphClient against the backend-owned store.
 */
export class InMemoryAttackGraphClient implements AttackGraphClient {
  private readonly store: AttackGraphStore;

  constructor(readonly scanSessionId: string, store?: AttackGraphStore) {
    this.store = store ?? new AttackGraphStore();
  }

  async addAsset(asset: Asset): Promise<void> {
    this.store.addAsset(asset);
  }
  async getAssets(): Promise<Asset[]> {
    return this.store.getAssets();
  }
  async addCandidate(
    c: CandidateFinding & { id: string; severity: Finding["severity"] },
  ): Promise<void> {
    this.store.addCandidate(c);
  }
  async getCandidates(): Promise<Finding[]> {
    return this.store.getCandidates();
  }
  async updateVerdict(
    findingId: string,
    verdict: Verdict,
    confidence: number,
    transcript?: string,
  ): Promise<void> {
    this.store.updateVerdict(findingId, verdict, confidence, transcript);
  }
  async getConfirmed(): Promise<Finding[]> {
    return this.store.getConfirmed();
  }
}
