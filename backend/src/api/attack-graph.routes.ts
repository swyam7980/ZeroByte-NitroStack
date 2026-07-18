import { Router } from "express";
import { z } from "zod";
import { AttackGraphRegistry } from "../state/attack-graph-registry.js";

const AssetBody = z.object({
  id: z.string(),
  kind: z.enum(["host", "subdomain", "endpoint", "service", "repo"]),
  value: z.string(),
  detectedStack: z.array(z.string()).default([]),
  parentId: z.string().optional(),
  discoveredBy: z.string(),
  discoveredAt: z.string(),
});

const CandidateBody = z.object({
  id: z.string(),
  type: z.string(),
  asset: z.string(),
  severity: z.enum(["info", "low", "medium", "high", "critical"]),
  confidence: z.number().min(0).max(1).default(0),
  status: z.enum(["candidate", "verifying", "confirmed", "unconfirmed"]).default("candidate"),
  description: z.string(),
  evidence: z.array(z.any()).default([]),
  reproduction: z.any().optional(),
  verificationTranscript: z.string().optional(),
  discoveredBy: z.string(),
  discoveredAt: z.string().optional(),
  verifiedAt: z.string().optional(),
});

const VerdictBody = z.object({
  verdict: z.enum(["confirmed", "inconclusive", "false_positive"]),
  confidence: z.number().min(0).max(1),
  transcript: z.string().optional(),
});

function sessionId(req: { header(name: string): string | undefined }): string {
  return req.header("x-scan-session") ?? "local-session";
}

export function attackGraphRoutes(registry: AttackGraphRegistry): Router {
  const r = Router();

  r.post("/assets", (req, res) => {
    const parsed = AssetBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const store = registry.forSession(sessionId(req));
    store.addAsset(parsed.data);
    return res.status(201).json(parsed.data);
  });

  r.get("/assets", (req, res) => {
    return res.json(registry.forSession(sessionId(req)).getAssets());
  });

  r.post("/candidates", (req, res) => {
    const parsed = CandidateBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const store = registry.forSession(sessionId(req));
    store.addCandidate(parsed.data as any);
    return res.status(201).json(parsed.data);
  });

  r.get("/candidates", (req, res) => {
    return res.json(registry.forSession(sessionId(req)).getCandidates());
  });

  r.post("/findings/:id/verdict", (req, res) => {
    const parsed = VerdictBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const store = registry.forSession(sessionId(req));
    store.updateVerdict(req.params.id, parsed.data.verdict, parsed.data.confidence, parsed.data.transcript);
    return res.status(204).send();
  });

  r.get("/findings/confirmed", (req, res) => {
    return res.json(registry.forSession(sessionId(req)).getConfirmed());
  });

  r.get("/snapshot", (req, res) => {
    return res.json(registry.snapshot(sessionId(req)));
  });

  return r;
}
