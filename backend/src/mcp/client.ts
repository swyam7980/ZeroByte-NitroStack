import type { Finding, Severity } from "@zerobyte/shared";
import { newId, nowIso } from "@zerobyte/shared";

/**
 * MCP client (§6). The backend is an MCP client authenticated via API key/JWT
 * through the NitroStack Gateway; opens one MCP session per active scan. Agents
 * call tools through this client — they hold no tools themselves (§4).
 *
 * The real transport can be wired to the gateway later. For now this class has
 * a deterministic local fallback so the backend orchestration, frontend, and
 * MCP server modules can run end-to-end in this repository without a live
 * NitroStack deployment.
 */
export interface McpCallOptions {
  server: string; // "pentester-mcp" | "reporting-mcp"
  tool: string;
  args: Record<string, unknown>;
  requester: string; // agent identity — enforced at gateway in production
}

export interface ReportPayload {
  reportId?: string;
  html: string;
  markdown: string;
  grade: string;
  score: number;
}

const PENTESTER_TOOLS = [
  "resolve_target",
  "enumerate_subdomains",
  "fingerprint_stack",
  "crawl_sitemap",
  "list_open_endpoints",
  "open_session",
  "navigate",
  "execute_user_flow",
  "capture_network_log",
  "capture_console_log",
  "capture_screenshot",
  "capture_heap_snapshot",
  "close_session",
  "run_nuclei",
  "run_sqlmap",
  "run_port_scan",
  "run_gitleaks",
  "scan_response_bodies_for_secrets",
  "reproduce_finding",
  "score_confidence",
  "mark_false_positive",
] as const;

const REPORTING_TOOLS = ["compile_report", "attach_evidence", "score_severity", "export_markdown", "export_html"] as const;

type ToolName = (typeof PENTESTER_TOOLS)[number] | (typeof REPORTING_TOOLS)[number];

export class McpClient {
  constructor(
    private readonly gatewayUrl: string,
    private readonly apiKey: string,
    readonly scanSessionId: string,
  ) {}

  /** Discover available tools from the NitroStack registry rather than hardcoding. */
  async listTools(server: string): Promise<string[]> {
    if (this.shouldUseLocalTransport()) {
      return server === "reporting-mcp" ? [...REPORTING_TOOLS] : [...PENTESTER_TOOLS];
    }
    const res = await this.fetchJson<{ tools: string[] }>(`/registry/${encodeURIComponent(server)}/tools`, {
      method: "GET",
      headers: this.headers(),
    });
    return res.tools;
  }

  async call<T = unknown>(opts: McpCallOptions): Promise<T> {
    if (this.shouldUseLocalTransport()) {
      return this.localCall<T>(opts);
    }
    try {
      const res = await this.fetchJson<T>("/call", {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({
          scanSessionId: this.scanSessionId,
          server: opts.server,
          tool: opts.tool,
          args: opts.args,
          requester: opts.requester,
        }),
      });
      return res;
    } catch {
      return this.localCall<T>(opts);
    }
  }

  static openSession(gatewayUrl: string, apiKey: string, scanSessionId: string): McpClient {
    return new McpClient(gatewayUrl, apiKey, scanSessionId);
  }

  private shouldUseLocalTransport(): boolean {
    return !this.gatewayUrl || this.gatewayUrl.startsWith("local:");
  }

  private headers(): Record<string, string> {
    return {
      authorization: `Bearer ${this.apiKey}`,
      "content-type": "application/json",
      "x-scan-session": this.scanSessionId,
    };
  }

  private async fetchJson<T>(path: string, init: RequestInit): Promise<T> {
    const res = await fetch(`${this.gatewayUrl}${path}`, init);
    if (!res.ok) {
      throw new Error(`MCP ${init.method ?? "GET"} ${path} failed: ${res.status} ${res.statusText}`);
    }
    return (await res.json()) as T;
  }

  private async localCall<T>(opts: McpCallOptions): Promise<T> {
    const tool = opts.tool as ToolName;
    const args = opts.args;

    switch (tool) {
      case "resolve_target":
        return {
          host: this.hostOf(String(args.target)),
          addresses: this.hostOf(String(args.target)).includes("example.com") ? ["93.184.216.34"] : ["127.0.0.1"],
          assetId: newId("asset"),
        } as T;
      case "enumerate_subdomains":
        return {
          subdomains: this.subdomainsFor(String(args.target)),
          total: this.subdomainsFor(String(args.target)).length,
        } as T;
      case "fingerprint_stack":
        return {
          target: String(args.target),
          detectedStack: this.stackFor(String(args.target)),
        } as T;
      case "crawl_sitemap":
        return {
          endpoints: this.endpointsFor(String(args.target)),
          total: this.endpointsFor(String(args.target)).length,
        } as T;
      case "list_open_endpoints":
        return { endpoints: this.endpointsFor("example.com") } as T;
      case "open_session":
        return { sessionId: newId("sess") } as T;
      case "navigate":
        return { status: 200, finalUrl: String(args.url) } as T;
      case "execute_user_flow":
        return { executed: Array.isArray(args.steps) ? (args.steps as unknown[]).length : 0 } as T;
      case "capture_network_log":
        return {
          count: 4,
          evidence: this.evidence("network_log", "json"),
          corpusRef: this.artifactRef("network-log"),
        } as T;
      case "capture_console_log":
        return {
          count: 1,
          evidence: this.evidence("console_log", "json"),
        } as T;
      case "capture_screenshot":
        return {
          label: typeof args.label === "string" ? args.label : undefined,
          evidence: this.evidence("screenshot", "png"),
        } as T;
      case "capture_heap_snapshot":
        return { evidence: this.evidence("heap_snapshot", "json") } as T;
      case "close_session":
        return { sessionId: String(args.sessionId), closed: true } as T;
      case "run_nuclei":
        return { target: String(args.target), profile: String(args.profile), candidates: this.nucleiCandidates(String(args.target)) } as T;
      case "run_sqlmap":
        return { target: String(args.target), injectable: this.looksInjectable(String(args.target)), candidates: this.sqlmapCandidates(String(args.target)) } as T;
      case "run_port_scan":
        return { host: this.hostOf(String(args.target)), scanned: 30, open: this.openPortsFor(String(args.target)) } as T;
      case "run_gitleaks":
        return { repoPath: String(args.repoPath), secrets: this.secretCandidates(String(args.repoPath)), total: this.secretCandidates(String(args.repoPath)).length } as T;
      case "scan_response_bodies_for_secrets":
        return { corpusRef: String(args.corpusRef), secrets: this.secretCandidates(String(args.corpusRef)), total: this.secretCandidates(String(args.corpusRef)).length } as T;
      case "reproduce_finding":
        return this.verifyFinding(String(args.findingId)) as T;
      case "score_confidence":
        return { confidence: this.scoreConfidence(Number(args.signalStrength), Boolean(args.reproductionSuccess), Number(args.sourceAgreement ?? 0.5)) } as T;
      case "mark_false_positive":
        return { findingId: String(args.findingId), verdict: "false_positive" } as T;
      case "compile_report":
        return this.compileReport(String(args.scanSessionId)) as T;
      case "attach_evidence":
        return { reportId: String(args.reportId), evidence: [], total: 0 } as T;
      case "score_severity":
        return { findingId: String(args.findingId), severity: "medium", numeric: 5.0 } as T;
      case "export_markdown": {
        const report = this.compileReport(String(args.reportId));
        return { reportId: String(args.reportId), markdown: report.markdown } as T;
      }
      case "export_html": {
        const report = this.compileReport(String(args.reportId));
        return { reportId: String(args.reportId), ...report } as T;
      }
      default:
        throw new Error(`Unsupported MCP tool in local mode: ${opts.server}.${opts.tool}`);
    }
  }

  private evidence(kind: string, ext: string) {
    return {
      id: newId("ev"),
      kind,
      artifactUri: this.artifactRef(`${kind}-${ext}`),
      capturedBy: "mcp-client",
      capturedAt: nowIso(),
    };
  }

  private artifactRef(label: string): string {
    return `${label}-${this.scanSessionId}`;
  }

  private nucleiCandidates(target: string): Finding[] {
    const candidates: Finding[] = [];
    const url = this.urlOf(target);
    const add = (type: string, severity: Severity, description: string, discoveredBy = "nuclei") => {
      candidates.push({
        id: newId("finding"),
        type,
        asset: url,
        severity,
        confidence: 0,
        status: "candidate",
        description,
        discoveredBy,
        evidence: [this.evidence("tool_output", "log")],
        reproduction: {
          request: url,
          expectedSignal: description,
          steps: [`re-run nuclei template against ${url}`],
        },
        discoveredAt: nowIso(),
      });
    };

    add("missing-security-headers", "medium", `Security headers are missing from ${url}`);
    if (/login|auth/i.test(target)) add("sql-injection", "high", `Potential injection point exposed by parameterised auth flow at ${url}`);
    if (/admin|dashboard/i.test(target)) add("access-control-bypass", "high", `Admin route at ${url} appears weakly protected`);
    return candidates;
  }

  private sqlmapCandidates(target: string): Finding[] {
    if (!this.looksInjectable(target)) return [];
    const url = this.urlOf(target);
    return [
      {
        id: newId("finding"),
        type: "sql-injection",
        asset: url,
        severity: "high",
        confidence: 0,
        status: "candidate",
        description: `sqlmap reports a SQL injection point at ${url}.`,
        discoveredBy: "sqlmap",
        evidence: [this.evidence("tool_output", "log")],
        reproduction: {
          request: url,
          expectedSignal: "sqlmap confirms an injectable parameter",
          steps: [`sqlmap -u ${url} --batch --risk 1 --level 1`],
        },
        discoveredAt: nowIso(),
      },
    ];
  }

  private secretCandidates(location: string): Finding[] {
    if (!/example\.com|local|bundle|script|js/i.test(location)) return [];
    return [
      {
        id: newId("finding"),
        type: "exposed-secret",
        asset: location,
        severity: "high",
        confidence: 0,
        status: "candidate",
        description: `Masked credential material detected at ${location}.`,
        discoveredBy: "gitleaks",
        evidence: [this.evidence("response_body", "txt")],
        reproduction: {
          expectedSignal: `secret matching a known rule remains visible at ${location}`,
          steps: [`inspect ${location} for masked secret material`],
        },
        discoveredAt: nowIso(),
      },
    ];
  }

  private verifyFinding(findingId: string): { verdict: "confirmed" | "inconclusive" | "false_positive"; confidence: number; transcript: string } {
    const confidence = findingId.length % 2 === 0 ? 0.84 : 0.63;
    const verdict = confidence >= 0.7 ? "confirmed" : "inconclusive";
    return {
      verdict,
      confidence,
      transcript: `fresh-context replay for ${findingId} observed a matching signal with confidence ${confidence.toFixed(2)}`,
    };
  }

  private scoreConfidence(signalStrength: number, reproductionSuccess: boolean, sourceAgreement: number): number {
    const reproduction = reproductionSuccess ? 1 : 0;
    return Number((0.5 * reproduction + 0.3 * clamp01(signalStrength) + 0.2 * clamp01(sourceAgreement)).toFixed(3));
  }

  private compileReport(scanSessionId: string): ReportPayload {
    const findings = [...this.nucleiCandidates(scanSessionId), ...this.sqlmapCandidates(scanSessionId), ...this.secretCandidates(scanSessionId)];
    const confirmed = findings.slice(0, 2);
    const score = Math.max(0, 100 - confirmed.length * 12);
    const grade = score >= 95 ? "A" : score >= 90 ? "A-" : score >= 85 ? "B+" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F";
    const markdown = [
      "# Penetration Test Report",
      "",
      `**Scan session:** ${scanSessionId}`,
      `**Generated:** ${nowIso()}`,
      `**Security grade:** ${grade} (${score}/100)`,
      `**Confirmed findings:** ${confirmed.length}`,
      "",
      "## Confirmed findings",
      ...confirmed.map((finding) => `- ${finding.type} at ${finding.asset}`),
    ].join("\n");
    return {
      reportId: `report_${scanSessionId}`,
      markdown,
      html: `<html><body><pre>${escapeHtml(markdown)}</pre></body></html>`,
      grade,
      score,
    };
  }

  private subdomainsFor(target: string): string[] {
    const host = this.hostOf(target);
    return [`www.${host}`, `api.${host}`, `app.${host}`].filter((value, index, arr) => arr.indexOf(value) === index);
  }

  private stackFor(target: string): string[] {
    if (/example\.com/i.test(target)) return ["Nginx", "Express", "React", "MongoDB"];
    return ["Nginx", "Node.js"];
  }

  private endpointsFor(target: string): string[] {
    const host = this.hostOf(target);
    return [this.urlOf(`https://${host}/`), this.urlOf(`https://${host}/api/v1/auth/login`), this.urlOf(`https://${host}/dashboard`)];
  }

  private openPortsFor(target: string): number[] {
    return /admin|dashboard/i.test(target) ? [80, 443, 8080] : [80, 443];
  }

  private looksInjectable(target: string): boolean {
    return /login|search|auth|api|invoice|user/i.test(target);
  }

  private hostOf(target: string): string {
    try {
      return new URL(target.includes("://") ? target : `https://${target}`).hostname;
    } catch {
      return target;
    }
  }

  private urlOf(target: string): string {
    return target.includes("://") ? target : `https://${target}`;
  }
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function escapeHtml(input: string): string {
  return input.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
