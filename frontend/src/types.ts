/** Mirrors backend finding/scan shapes (§10). Kept local to avoid coupling the
 *  browser bundle to the shared Node package; sync manually if schemas change. */
export type Severity = "info" | "low" | "medium" | "high" | "critical";

export interface Finding {
  id: string;
  type: string;
  asset: string;
  severity: Severity;
  confidence: number;
  status: "candidate" | "verifying" | "confirmed" | "unconfirmed";
  description: string;
  discoveredBy: string;
}

export interface ScanJob {
  id: string;
  target: string;
  status: "queued" | "running" | "complete" | "failed";
  createdAt: string;
}

export interface ProgressEvent {
  jobId: string;
  stage: "recon" | "browser" | "scan" | "secrets" | "verify" | "report" | "complete";
  message: string;
}
