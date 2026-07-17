import { z } from "zod";

/** A discovered asset (host, endpoint, service) — output of Recon MCP (§2.1). */
export const Asset = z.object({
  id: z.string(),
  kind: z.enum(["host", "subdomain", "endpoint", "service", "repo"]),
  value: z.string(),                 // e.g. "api.example.com", "https://.../login"
  detectedStack: z.array(z.string()).default([]),  // frameworks/versions
  parentId: z.string().optional(),   // edge back to the asset that surfaced this
  discoveredBy: z.string(),
  discoveredAt: z.string(),
});
export type Asset = z.infer<typeof Asset>;

/**
 * Attack Graph is append-only (§6). Every tool call that discovers an asset or
 * finding writes a new node/edge rather than mutating existing state, so the
 * graph doubles as an audit trail.
 */
export const AttackGraphNode = z.discriminatedUnion("nodeType", [
  z.object({ nodeType: z.literal("asset"), data: Asset }),
  // Finding is imported at store level to avoid circular schema deps; kept loose here.
  z.object({ nodeType: z.literal("finding"), data: z.record(z.unknown()) }),
]);
export type AttackGraphNode = z.infer<typeof AttackGraphNode>;

export const AttackGraphEdge = z.object({
  from: z.string(),
  to: z.string(),
  relation: z.enum(["discovered_from", "candidate_of", "verified_as", "evidence_for"]),
});
export type AttackGraphEdge = z.infer<typeof AttackGraphEdge>;
