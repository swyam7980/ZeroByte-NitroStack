import { Router } from "express";
import { z } from "zod";
import type { ScanQueue } from "../queue/scan-queue.js";

const StartScanBody = z.object({
  target: z.string(),
  scopeRef: z.string().optional(),
});

/**
 * Scan CRUD over REST (§6). Live updates go over WebSocket (see ws/gateway).
 */
export function scanRoutes(queue: ScanQueue): Router {
  const r = Router();

  r.post("/scans", (req, res) => {
    const parsed = StartScanBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    // TODO: enqueue and broadcast progress over WS.
    return res.status(501).json({ error: "not implemented" });
  });

  r.get("/scans", (_req, res) => res.json({ scans: queue.list() }));

  r.get("/scans/:id", (req, res) => {
    const job = queue.get(req.params.id);
    if (!job) return res.status(404).json({ error: "not found" });
    return res.json(job);
  });

  r.get("/scans/:id/report", (_req, res) => {
    // TODO: return rendered report + evidence bundle reference.
    return res.status(501).json({ error: "not implemented" });
  });

  return r;
}
