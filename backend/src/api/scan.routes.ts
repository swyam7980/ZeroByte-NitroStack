import { Router } from "express";
import { z } from "zod";
import type { ScanQueue } from "../queue/scan-queue.js";
import type { ScanProgress } from "../agents/orchestrator.agent.js";

const StartScanBody = z.object({
  target: z.string(),
  profile: z.enum(["quick_recon", "standard_audit", "deep_injection", "custom"]).optional(),
  scopeRef: z.string().optional(),
  auth: z.object({ bearer: z.string().optional(), cookie: z.string().optional() }).optional(),
});

/**
 * Scan CRUD over REST (§6). Live updates go over WebSocket (see ws/gateway).
 */
export function scanRoutes(queue: ScanQueue, onProgress: (jobId: string, progress: ScanProgress) => void): Router {
  const r = Router();

  r.post("/scans", (req, res) => {
    const parsed = StartScanBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const job = queue.enqueue(parsed.data, onProgress);
    return res.status(202).json(job);
  });

  r.get("/scans", (_req, res) => res.json({ scans: queue.list() }));

  r.get("/scans/:id", (req, res) => {
    const job = queue.get(req.params.id);
    if (!job) return res.status(404).json({ error: "not found" });
    return res.json(job);
  });

  r.get("/scans/:id/report", (_req, res) => {
    const report = queue.getReport(_req.params.id);
    if (!report) return res.status(404).json({ error: "report not ready" });
    return res.json(report);
  });

  return r;
}
