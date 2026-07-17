import { Injectable, ToolDecorator as Tool, z, type ExecutionContext } from "@nitrostack/core";
import { ReportService } from "./report.service.js";
import { AttackGraphProvider } from "../../common/attack-graph.provider.js";

/**
 * Reporting MCP tools (§2.2, §10). Narrowest permission footprint — no scan/
 * browser/Docker privileges. Consumes ONLY confirmed findings from the attack
 * graph, groups by severity/asset, renders Markdown (source of truth) → HTML.
 */
@Injectable()
export class ReportTools {
  constructor(
    private readonly report: ReportService,
    private readonly graph: AttackGraphProvider,
  ) {}

  @Tool({
    name: "compile_report",
    description: "Compile confirmed findings into a structured report model.",
    inputSchema: z.object({ scanSessionId: z.string() }),
  })
  async compileReport(_input: { scanSessionId: string }, _ctx: ExecutionContext) {
    // TODO: getConfirmed() → group by severity/asset → build report model
    throw new Error("not implemented");
  }

  @Tool({
    name: "attach_evidence",
    description: "Bundle referenced evidence artifacts alongside the report.",
    inputSchema: z.object({ reportId: z.string() }),
  })
  async attachEvidence(_input: { reportId: string }, _ctx: ExecutionContext) {
    throw new Error("not implemented");
  }

  @Tool({
    name: "score_severity",
    description: "Score severity (CVSS-inspired: impact × exploitability × confidence bucket).",
    inputSchema: z.object({ findingId: z.string() }),
  })
  async scoreSeverity(_input: { findingId: string }, _ctx: ExecutionContext) {
    throw new Error("not implemented");
  }

  @Tool({
    name: "export_markdown",
    description: "Render the report to Markdown (source of truth).",
    inputSchema: z.object({ reportId: z.string() }),
  })
  async exportMarkdown(_input: { reportId: string }, _ctx: ExecutionContext) {
    throw new Error("not implemented");
  }

  @Tool({
    name: "export_html",
    description: "Render the report to HTML for the dashboard view.",
    inputSchema: z.object({ reportId: z.string() }),
  })
  async exportHtml(_input: { reportId: string }, _ctx: ExecutionContext) {
    throw new Error("not implemented");
  }
}
