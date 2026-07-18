import { BaseAgent } from "./base.agent.js";
import type { Finding } from "@zerobyte/shared";

/**
 * Reporting Agent (§4, §10). Consumes only `confirmed` findings from the Attack
 * Graph and calls Reporting MCP tools to compile and render. The Gateway denies
 * it any access to Pentester MCP at all (§11).
 */
export class ReportingAgent extends BaseAgent {
  readonly identity = "reporting-agent";
  readonly allowedServers = ["reporting-mcp"];
  readonly allowedModules = ["report"];

  constructor(mcp: ConstructorParameters<typeof BaseAgent>[0]) {
    super(mcp);
  }

  async run(scanSessionId: string, confirmed: Finding[]): Promise<{
    reportId: string;
    markdown: string;
    html: string;
    score: number;
    grade: string;
  }> {
    const confirmedCount = confirmed.length;
    const compiled = await this.call<{
      reportId: string;
      findings: number;
      score: number;
      grade: string;
    }>("reporting-mcp", "compile_report", { scanSessionId });
    await this.call("reporting-mcp", "attach_evidence", { reportId: compiled.reportId });
    const markdown = await this.call<{ markdown: string }>("reporting-mcp", "export_markdown", { reportId: compiled.reportId });
    const html = await this.call<{ html: string; markdown?: string; grade?: string; score?: number }>(
      "reporting-mcp",
      "export_html",
      { reportId: compiled.reportId },
    );

    return {
      reportId: compiled.reportId,
      markdown: confirmedCount ? markdown.markdown : `${markdown.markdown}\n\n_No confirmed findings were returned to Reporting MCP._`,
      html: html.html,
      score: html.score ?? compiled.score,
      grade: html.grade ?? compiled.grade,
    };
  }
}
