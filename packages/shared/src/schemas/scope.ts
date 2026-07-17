import { z } from "zod";

/** Parsed representation of scope.yaml (§11). Single source of truth for targets. */
export const ScopeConfig = z.object({
  scan_session: z.object({
    name: z.string(),
    description: z.string().optional(),
  }),
  in_scope: z.object({
    hosts: z.array(z.string()).default([]),
    paths: z.array(z.string()).default([]),
  }),
  out_of_scope: z.object({
    hosts: z.array(z.string()).default([]),
    paths: z.array(z.string()).default([]),
  }).default({ hosts: [], paths: [] }),
  limits: z.object({
    max_requests_per_second: z.number().default(10),
    max_concurrent_sessions: z.number().default(3),
    request_timeout_ms: z.number().default(30000),
    scan_timeout_ms: z.number().default(600000),
  }),
  allowed_tools: z.object({
    nuclei: z.object({ profiles: z.array(z.string()) }).optional(),
    sqlmap: z.object({ risk: z.number(), level: z.number() }).optional(),
    gitleaks: z.object({ enabled: z.boolean() }).optional(),
  }).default({}),
  network: z.object({
    allow_egress_to_scope_only: z.boolean().default(true),
  }).default({ allow_egress_to_scope_only: true }),
});
export type ScopeConfig = z.infer<typeof ScopeConfig>;

/** Result of a scope check — attached to audit log on rejection. */
export interface ScopeCheckResult {
  allowed: boolean;
  reason?: string;
}
