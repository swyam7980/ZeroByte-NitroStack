import { z } from "zod";

/** Severity buckets (CVSS-inspired, simplified for hackathon scope — §10). */
export const Severity = z.enum(["info", "low", "medium", "high", "critical"]);
export type Severity = z.infer<typeof Severity>;

/** Verification verdict lifecycle (§9). */
export const Verdict = z.enum(["confirmed", "inconclusive", "false_positive"]);
export type Verdict = z.infer<typeof Verdict>;

/** Where a finding sits in the pipeline. */
export const FindingStatus = z.enum([
  "candidate",   // raw scanner output, not yet verified
  "verifying",
  "confirmed",
  "unconfirmed", // retained in AG for transparency, filtered from report
]);
export type FindingStatus = z.infer<typeof FindingStatus>;

/** Evidence artifact reference — never inline blobs into MCP payloads (§7). */
export const EvidenceRef = z.object({
  id: z.string(),
  kind: z.enum(["screenshot", "network_log", "console_log", "tool_output", "heap_snapshot", "response_body"]),
  artifactUri: z.string(),          // pointer into artifact store, not the bytes
  capturedBy: z.string(),           // which agent/server
  capturedAt: z.string(),           // ISO timestamp
});
export type EvidenceRef = z.infer<typeof EvidenceRef>;

/**
 * Minimal reproduction recipe (§9). If a candidate can't be expressed this way
 * it is auto-marked inconclusive rather than passed through.
 */
export const ReproductionRecipe = z.object({
  request: z.string().optional(),     // raw HTTP request / step list
  payload: z.string().optional(),
  expectedSignal: z.string(),         // what must be observed to confirm
  steps: z.array(z.string()).default([]),
});
export type ReproductionRecipe = z.infer<typeof ReproductionRecipe>;

/** Core finding schema (§10). */
export const Finding = z.object({
  id: z.string(),
  type: z.string(),                   // e.g. "sql-injection", "exposed-secret"
  asset: z.string(),                  // host/endpoint
  severity: Severity,
  confidence: z.number().min(0).max(1),
  status: FindingStatus,
  verdict: Verdict.optional(),
  description: z.string(),
  evidence: z.array(EvidenceRef).default([]),
  reproduction: ReproductionRecipe.optional(),
  verificationTranscript: z.string().optional(),
  discoveredBy: z.string(),           // agent/server id
  discoveredAt: z.string(),
  verifiedAt: z.string().optional(),
});
export type Finding = z.infer<typeof Finding>;

/** Candidate emitted by a scanner before verification. */
export const CandidateFinding = Finding.pick({
  type: true,
  asset: true,
  description: true,
  evidence: true,
  reproduction: true,
  discoveredBy: true,
}).extend({
  rawOutputRef: z.string().optional(),
});
export type CandidateFinding = z.infer<typeof CandidateFinding>;
