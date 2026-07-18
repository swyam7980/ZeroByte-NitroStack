import { Injectable, ToolDecorator as Tool, z, type ExecutionContext } from "@nitrostack/core";
import type { Finding } from "@zerobyte/shared";
import { ReportService, type ReportModel } from "./report.service.js";
import { AttackGraphProvider } from "../../common/attack-graph.provider.js";

/**
 * Reporting MCP tools (§2.2, §10). Narrowest permission footprint — no scan/
 * browser/Docker privileges. Consumes ONLY confirmed findings from the attack
 * graph, groups by severity/asset, renders Markdown (source of truth) → HTML.
 *
 * Compiled report models are held in-process, keyed by reportId, so the export/
 * attach tools operate on the model compile_report produced.
 */
@Injectable()
export class ReportTools {
  private readonly compiled = new Map<string, ReportModel>();

  constructor(
    private readonly report: ReportService,
    private readonly graph: AttackGraphProvider,
  ) {}

  @Tool({
    name: "compile_report",
    description: "Compile confirmed findings into a structured report model.",
    inputSchema: z.object({ scanSessionId: z.string() }),
  })
  async compileReport(input: { scanSessionId: string }, ctx: ExecutionContext) {
    const confirmed = await this.graph.client.getConfirmed();
    const model = this.report.compile(input.scanSessionId, confirmed);
    this.compiled.set(model.id, model);
    ctx.logger?.info?.("compile_report", { reportId: model.id, findings: confirmed.length, score: model.score });
    return {
      reportId: model.id,
      findings: model.findings.length,
      score: model.score,
      grade: model.grade,
      severityCounts: this.severityCounts(model),
    };
  }

  @Tool({
    name: "attach_evidence",
    description: "Bundle referenced evidence artifacts alongside the report.",
    inputSchema: z.object({ reportId: z.string() }),
  })
  async attachEvidence(input: { reportId: string }, _ctx: ExecutionContext) {
    const model = this.require(input.reportId);
    const refs = model.findings.flatMap((f: Finding) => f.evidence.map((e) => ({ findingId: f.id, ...e })));
    return { reportId: input.reportId, evidence: refs, total: refs.length };
  }

  @Tool({
    name: "score_severity",
    description: "Score severity (CVSS-inspired: impact × exploitability × confidence bucket).",
    inputSchema: z.object({ findingId: z.string() }),
  })
  async scoreSeverity(input: { findingId: string }, _ctx: ExecutionContext) {
    for (const model of this.compiled.values()) {
      const f = model.findings.find((x) => x.id === input.findingId);
      if (f) return { findingId: input.findingId, ...this.report.scoreSeverity(f) };
    }
    return { findingId: input.findingId, error: "finding not found in any compiled report" };
  }

  @Tool({
    name: "export_markdown",
    description: "Render the report to Markdown (source of truth).",
    inputSchema: z.object({ reportId: z.string() }),
  })
  async exportMarkdown(input: { reportId: string }, _ctx: ExecutionContext) {
    const model = this.require(input.reportId);
    return { reportId: input.reportId, markdown: this.report.toMarkdown(model) };
  }

  @Tool({
    name: "export_html",
    description: "Render the report to HTML for the dashboard view.",
    inputSchema: z.object({ reportId: z.string() }),
  })
  async exportHtml(input: { reportId: string }, _ctx: ExecutionContext) {
    const model = this.require(input.reportId);
    const markdown = this.report.toMarkdown(model);
    // Matches the frontend ReportPayload shape: { html, markdown, grade, score }.
    return { reportId: input.reportId, html: this.report.toHtml(markdown), markdown, grade: model.grade, score: model.score };
  }

  private require(reportId: string): ReportModel {
    const model = this.compiled.get(reportId);
    if (!model) throw new Error(`unknown reportId ${reportId} — call compile_report first`);
    return model;
  }

  private severityCounts(model: ReportModel): Record<string, number> {
    return Object.fromEntries(Object.entries(model.groupedBySeverity).map(([k, v]) => [k, v.length]));
  }
}
