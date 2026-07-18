import type { Asset } from "../schemas/attack-graph.js";
import type { Finding, CandidateFinding, Verdict } from "../schemas/finding.js";
import type { AttackGraphClient } from "./client.js";

/**
 * HTTP-backed AttackGraphClient (§6). The deployed topology has two separate MCP
 * processes (pentester + reporting) that never call each other — they share the
 * backend-owned Attack Graph store through this client.
 *
 * REST contract the backend must expose (all scoped by scan-session id header):
 *   POST   {base}/assets            body: Asset
 *   GET    {base}/assets            -> Asset[]
 *   POST   {base}/candidates        body: CandidateFinding & { id, severity }
 *   GET    {base}/candidates        -> Finding[]
 *   POST   {base}/findings/:id/verdict  body: { verdict, confidence, transcript? }
 *   GET    {base}/findings/confirmed    -> Finding[]
 *
 * The scan-session id travels in the `x-scan-session` header so the backend can
 * partition state per scan and re-check scope independently of the caller (§6).
 */
export class HttpAttackGraphClient implements AttackGraphClient {
  constructor(
    private readonly baseUrl: string,
    readonly scanSessionId: string,
    private readonly authToken?: string,
  ) {}

  async addAsset(asset: Asset): Promise<void> {
    await this.post("/assets", asset);
  }
  async getAssets(): Promise<Asset[]> {
    return this.get<Asset[]>("/assets");
  }
  async addCandidate(
    c: CandidateFinding & { id: string; severity: Finding["severity"] },
  ): Promise<void> {
    await this.post("/candidates", c);
  }
  async getCandidates(): Promise<Finding[]> {
    return this.get<Finding[]>("/candidates");
  }
  async updateVerdict(
    findingId: string,
    verdict: Verdict,
    confidence: number,
    transcript?: string,
  ): Promise<void> {
    await this.post(`/findings/${encodeURIComponent(findingId)}/verdict`, {
      verdict,
      confidence,
      transcript,
    });
  }
  async getConfirmed(): Promise<Finding[]> {
    return this.get<Finding[]>("/findings/confirmed");
  }

  // ── transport ───────────────────────────────────────────
  private headers(): Record<string, string> {
    const h: Record<string, string> = {
      "content-type": "application/json",
      "x-scan-session": this.scanSessionId,
    };
    if (this.authToken) h.authorization = `Bearer ${this.authToken}`;
    return h;
  }

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, { headers: this.headers() });
    if (!res.ok) {
      throw new Error(`AttackGraph GET ${path} failed: ${res.status} ${res.statusText}`);
    }
    return (await res.json()) as T;
  }

  private async post(path: string, body: unknown): Promise<void> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`AttackGraph POST ${path} failed: ${res.status} ${res.statusText}`);
    }
  }
}
