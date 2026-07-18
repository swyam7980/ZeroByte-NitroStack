import type { OrchestratorAgent, ScanProgress } from "../agents/orchestrator.agent.js";

export interface ScanJob {
  id: string;
  target: string;
  status: "queued" | "running" | "complete" | "failed";
  createdAt: string;
}

/**
 * Job Queue / Scan Orchestrator (§1). Enqueues scans and opens an MCP session
 * per active scan. In-memory for the hackathon; swap for BullMQ/Redis later.
 */
export class ScanQueue {
  private jobs = new Map<string, ScanJob>();

  constructor(private readonly orchestratorFactory: (scanSessionId: string) => OrchestratorAgent) {}

  enqueue(_target: string, _onProgress: (jobId: string, p: ScanProgress) => void): ScanJob {
    void this.orchestratorFactory;
    // TODO: create job, open MCP session, run orchestrator, emit progress.
    throw new Error("not implemented");
  }

  get(id: string): ScanJob | undefined {
    return this.jobs.get(id);
  }

  list(): ScanJob[] {
    return [...this.jobs.values()];
  }
}
