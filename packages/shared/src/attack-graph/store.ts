import type { Asset, AttackGraphEdge } from "../schemas/attack-graph.js";
import type { Finding, CandidateFinding, Verdict } from "../schemas/finding.js";

/**
 * Backend-owned Attack Graph store (§6). Append-only. MCP servers never call
 * each other — they read/write shared state through this store via an injected
 * client. In-memory here for the hackathon; swap for a real store later.
 */
export class AttackGraphStore {
  private assets = new Map<string, Asset>();
  private findings = new Map<string, Finding>();
  private edges: AttackGraphEdge[] = [];

  // ── Assets ──────────────────────────────────────────────
  addAsset(asset: Asset): void {
    this.assets.set(asset.id, asset);
    if (asset.parentId) {
      this.edges.push({ from: asset.parentId, to: asset.id, relation: "discovered_from" });
    }
  }
  getAssets(): Asset[] {
    return [...this.assets.values()];
  }

  // ── Findings ────────────────────────────────────────────
  addCandidate(candidate: CandidateFinding & { id: string; severity: Finding["severity"] }): void {
    const finding: Finding = {
      ...candidate,
      confidence: 0,
      status: "candidate",
      discoveredAt: new Date().toISOString(),
    } as Finding;
    this.findings.set(finding.id, finding);
    this.edges.push({ from: finding.asset, to: finding.id, relation: "candidate_of" });
  }

  updateVerdict(findingId: string, verdict: Verdict, confidence: number, transcript?: string): void {
    const f = this.findings.get(findingId);
    if (!f) return;
    f.verdict = verdict;
    f.confidence = confidence;
    f.verificationTranscript = transcript;
    f.status = verdict === "confirmed" ? "confirmed" : "unconfirmed";
    this.edges.push({ from: findingId, to: findingId, relation: "verified_as" });
  }

  getCandidates(): Finding[] {
    return [...this.findings.values()].filter((f) => f.status === "candidate");
  }
  getConfirmed(): Finding[] {
    return [...this.findings.values()].filter((f) => f.status === "confirmed");
  }
  getAllFindings(): Finding[] {
    return [...this.findings.values()];
  }

  // ── Audit / debug ───────────────────────────────────────
  snapshot() {
    return {
      assets: this.getAssets(),
      findings: this.getAllFindings(),
      edges: this.edges,
    };
  }
}
