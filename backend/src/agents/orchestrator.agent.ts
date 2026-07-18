import { BaseAgent } from "./base.agent.js";
import type { ReconExploitationAgent } from "./recon-exploitation.agent.js";
import type { VerificationAgent } from "./verification.agent.js";
import type { ReportingAgent } from "./reporting.agent.js";
import type { Finding, ScanProfile, SurfaceSnapshot } from "@zerobyte/shared";

export interface ReportPayload {
  html: string;
  markdown: string;
  grade: string;
  score: number;
}

export interface ScanProgress {
  stage: "recon" | "browser" | "scan" | "secrets" | "verify" | "report" | "complete";
  message: string;
  finding?: Finding;
  surface?: Partial<SurfaceSnapshot>;
  progress?: number;
  phase?: string;
  status?: "queued" | "running" | "complete" | "failed";
  ts?: string;
  kind?: "CRAWL" | "FUZZ" | "SCAN" | "ALERT" | "VERIFY" | "INFO" | "REPORT";
  report?: ReportPayload;
}

export interface ScanResult {
  findings: Finding[];
  report: ReportPayload;
  surface: SurfaceSnapshot;
}

/**
 * Orchestrator Agent (§4). Owns the scan lifecycle end-to-end. Sequences the
 * pipeline (recon → browser/scan → secrets → verification → report), retries
 * failed tool calls, and is the ONLY agent allowed to mark a scan complete.
 * Holds no direct scanning/reporting tool access itself — it delegates to the
 * other three agents.
 */
export class OrchestratorAgent extends BaseAgent {
  readonly identity = "orchestrator-agent";
  readonly allowedServers: string[] = []; // delegates; holds no direct tool access
  readonly allowedModules: string[] = [];

  constructor(
    mcp: ConstructorParameters<typeof BaseAgent>[0],
    private readonly agents: {
      reconExploitation: ReconExploitationAgent;
      verification: VerificationAgent;
      reporting: ReportingAgent;
    },
  ) {
    super(mcp);
  }

  /**
   * Drives the pipeline. `onProgress` streams stage updates so findings reach
   * the frontend as each stage completes, not just at the end (§5).
   *
   * Flow (§4, §5): assign asset → Recon & Exploitation surfaces candidates →
   * dispatch each candidate to Verification → hand confirmed findings to
   * Reporting → mark complete.
   */
  async runScan(
    target: string,
    onProgress: (p: ScanProgress) => void,
    profile: ScanProfile = "standard_audit",
    scanSessionId = `scan-${Date.now().toString(36)}`,
  ): Promise<ScanResult> {
    onProgress({ stage: "recon", message: `Resolving ${target}…`, progress: 8, phase: "Recon" });
    const discovery = await this.agents.reconExploitation.run(target, profile);
    onProgress({
      stage: "recon",
      message: `Mapped ${discovery.surface.subdomains} subdomains and ${discovery.surface.openPorts.length} open ports`,
      progress: 34,
      phase: "Recon",
      surface: discovery.surface,
    });
    if (discovery.browserSessionId) {
      onProgress({
        stage: "browser",
        message: `Browser session ${discovery.browserSessionId} established for deeper validation`,
        progress: 38,
        phase: "Browser",
        kind: "INFO",
      });
    }

    const candidates = discovery.candidates.map((finding) => ({ ...finding, status: "candidate" as const }));
    for (const finding of candidates) {
      onProgress({
        stage: finding.discoveredBy === "gitleaks" ? "secrets" : "scan",
        message: `Candidate surfaced: ${finding.type} at ${finding.asset}`,
        kind: finding.severity === "critical" || finding.severity === "high" ? "ALERT" : "SCAN",
        progress: 42,
        finding,
      });
    }

    onProgress({ stage: "verify", message: "Dispatching candidates to fresh-context verification…", progress: 68, phase: "Verification" });
    const verified: Finding[] = [];
    for (const finding of candidates) {
      onProgress({ stage: "verify", message: `Verifying ${finding.type}…`, progress: 72, finding, kind: "VERIFY" });
      const next = await this.agents.verification.run(finding);
      verified.push(next);
      onProgress({
        stage: "verify",
        message: `${next.status === "confirmed" ? "Confirmed" : "Dropped"} ${finding.type}`,
        progress: 82,
        finding: next,
        kind: next.status === "confirmed" ? "VERIFY" : "INFO",
      });
    }

    onProgress({ stage: "report", message: "Compiling report from confirmed findings…", progress: 94, phase: "Reporting" });
    const report = await this.agents.reporting.run(
      scanSessionId,
      verified.filter((finding) => finding.status === "confirmed"),
    );
    onProgress({
      stage: "complete",
      message: "Scan complete — report ready.",
      progress: 100,
      phase: "Complete",
      status: "complete",
      report,
      kind: "REPORT",
    });

    return {
      findings: verified,
      report,
      surface: discovery.surface,
    };
  }
}
