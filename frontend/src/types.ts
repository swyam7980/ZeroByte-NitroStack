/**
 * Wire contract between the ZeroByte dashboard and the backend (§6, §10).
 *
 * Single source of truth for everything crossing the REST + WebSocket boundary.
 * Mirrors the backend finding/scan schemas but kept LOCAL so the browser bundle
 * never imports the Node-side `@zerobyte/shared` package. Sync manually if the
 * backend schemas change.
 *
 * The frontend is deliberately tolerant: every WS frame field beyond `stage`
 * and `message` is optional, so the dashboard renders whether the backend
 * streams bare progress lines or richer finding/report payloads.
 */

// ─── Findings (§10) ────────────────────────────────────────
export type Severity = "critical" | "high" | "medium" | "low" | "info";

/** Verification lifecycle (§9) — ZeroByte's core differentiator. */
export type FindingStatus = "candidate" | "verifying" | "confirmed" | "unconfirmed";

export interface EvidenceRef {
  id: string;
  kind: "screenshot" | "network_log" | "console_log" | "tool_output" | "heap_snapshot" | "response_body";
  artifactUri: string;
}

export interface Finding {
  id: string;
  type: string; // e.g. "sql-injection", "exposed-secret"
  asset: string; // host / endpoint / location
  severity: Severity;
  confidence: number; // 0..1
  status: FindingStatus;
  description: string;
  discoveredBy: string; // which tool/module surfaced it (nuclei, sqlmap, gitleaks…)
  evidence?: EvidenceRef[];
  verificationTranscript?: string;
  discoveredAt?: string;
  verifiedAt?: string;
}

// ─── Scans (REST) ──────────────────────────────────────────
export type ScanStatus = "queued" | "running" | "complete" | "failed";

/**
 * Analysis-depth profiles map onto ZeroByte's Pentester MCP modules + scope
 * (§2.1, §11). The model never sends free-form args — a profile selects which
 * scope-guarded modules run.
 */
export type ScanProfile = "quick_recon" | "standard_audit" | "deep_injection" | "custom";

export interface ScanJob {
  id: string;
  target: string;
  profile?: ScanProfile;
  status: ScanStatus;
  createdAt: string;
  /** Optional server-computed rollups shown on the dashboard. */
  riskScore?: number;
  severityCounts?: Record<Severity, number>;
}

// ─── Pipeline stages (§5) — the four-agent sequence ────────
export type ScanStage =
  | "recon"
  | "browser"
  | "scan"
  | "secrets"
  | "verify"
  | "report"
  | "complete";

/**
 * A live update over the WS gateway. The backend broadcasts one per pipeline
 * stage as it completes. `finding` / `status` / `surface` are optional so the
 * same frame type carries plain progress lines *and* structured payloads.
 */
export interface ProgressEvent {
  jobId: string;
  stage: ScanStage;
  message: string;
  /** Optional agent-activity classification for the live feed (CRAWL/FUZZ/ALERT…). */
  kind?: AgentLogKind;
  finding?: Finding; // present when this event surfaced/updated a finding
  status?: ScanStatus; // present on lifecycle transitions
  surface?: Partial<SurfaceSnapshot>; // recon updates to the attack surface
  progress?: number; // 0..100 overall progress, if the backend computes it
  phase?: string; // human phase label, e.g. "Deep Crawl"
  ts?: string; // optional server timestamp (ISO)
}

export type AgentLogKind = "CRAWL" | "FUZZ" | "SCAN" | "ALERT" | "VERIFY" | "INFO" | "REPORT";

// ─── Attack surface (recon output, §2.1) ───────────────────
export interface SurfaceSnapshot {
  openPorts: number[];
  subdomains: number;
  wafDetected: string | null;
  detectedStack: string[];
}

// ─── Report (§10) ──────────────────────────────────────────
export interface ReportPayload {
  html: string;
  markdown?: string;
  grade?: string; // e.g. "B+"
  score?: number; // 0..100
}
