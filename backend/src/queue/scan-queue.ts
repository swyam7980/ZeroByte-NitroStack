import { newId, nowIso, type Finding, type ScanProfile } from "@zerobyte/shared";
import type { OrchestratorAgent, ScanProgress, ScanResult } from "../agents/orchestrator.agent.js";
import type { ReportPayload } from "../mcp/client.js";
import { AttackGraphRegistry } from "../state/attack-graph-registry.js";

export interface ScanJob {
  id: string;
  target: string;
  profile?: ScanProfile;
  status: "queued" | "running" | "complete" | "failed";
  createdAt: string;
  report?: ReportPayload;
  findings?: Finding[];
  phase?: string;
  progress?: number;
  error?: string;
}

export interface StartScanInput {
  target: string;
  profile?: ScanProfile;
  scopeRef?: string;
  auth?: { bearer?: string; cookie?: string };
}

/**
 * Job Queue / Scan Orchestrator (§1). Enqueues scans and opens an MCP session
 * per active scan. In-memory for the hackathon; swap for BullMQ/Redis later.
 */
export class ScanQueue {
  private readonly jobs = new Map<string, ScanJob>();

  constructor(
    private readonly orchestratorFactory: (scanSessionId: string) => OrchestratorAgent,
    private readonly graphs: AttackGraphRegistry,
  ) {}

  enqueue(input: StartScanInput, onProgress: (jobId: string, p: ScanProgress) => void): ScanJob {
    const id = newId("scan");
    const job: ScanJob = {
      id,
      target: input.target,
      profile: input.profile,
      status: "queued",
      createdAt: nowIso(),
    };
    this.jobs.set(id, job);

    queueMicrotask(async () => {
      const graph = this.graphs.forSession(id);
      try {
        this.update(id, { status: "running", phase: "Initializing", progress: 1 });
        const orchestrator = this.orchestratorFactory(id);
        const result: ScanResult = await orchestrator.runScan(
          input.target,
          (progress) => {
            if (progress.finding) {
              this.applyFinding(graph, progress.finding);
            }
            if (progress.report) {
              this.update(id, { report: progress.report });
            }
            this.update(id, {
              status: progress.status ?? this.jobs.get(id)?.status,
              phase: progress.phase ?? this.jobs.get(id)?.phase,
              progress: progress.progress ?? this.jobs.get(id)?.progress,
              findings: progress.finding ? mergeFinding(this.jobs.get(id)?.findings ?? [], progress.finding) : this.jobs.get(id)?.findings,
            });
            onProgress(id, progress);
          },
          input.profile,
          id,
        );

        for (const finding of result.findings) {
          this.applyFinding(graph, finding);
        }
        this.update(id, {
          status: "complete",
          report: result.report,
          findings: result.findings,
          phase: "Complete",
          progress: 100,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "scan failed";
        this.update(id, { status: "failed", error: message, phase: "Failed" });
        onProgress(id, {
          stage: "complete",
          message,
          progress: 100,
          phase: "Failed",
          status: "failed",
        });
      }
    });

    return job;
  }

  get(id: string): ScanJob | undefined {
    return this.jobs.get(id);
  }

  list(): ScanJob[] {
    return [...this.jobs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  getReport(id: string): ReportPayload | undefined {
    return this.jobs.get(id)?.report;
  }

  private update(id: string, patch: Partial<ScanJob>): void {
    const job = this.jobs.get(id);
    if (!job) return;
    this.jobs.set(id, { ...job, ...patch });
  }

  private applyFinding(graph: ReturnType<AttackGraphRegistry["forSession"]>, finding: Finding): void {
    graph.addCandidate({
      ...finding,
      discoveredAt: finding.discoveredAt ?? nowIso(),
    });
    if (finding.status === "confirmed") {
      graph.updateVerdict(finding.id, "confirmed", finding.confidence, finding.verificationTranscript);
    } else if (finding.status === "unconfirmed") {
      graph.updateVerdict(finding.id, "false_positive", finding.confidence, finding.verificationTranscript);
    }
  }
}

function mergeFinding(list: Finding[], incoming: Finding): Finding[] {
  const idx = list.findIndex((f) => f.id === incoming.id);
  if (idx === -1) return [...list, incoming];
  const next = list.slice();
  next[idx] = { ...next[idx], ...incoming };
  return next;
}
