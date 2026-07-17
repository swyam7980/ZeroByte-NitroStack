import { BaseAgent } from "./base.agent.js";

/**
 * Reporting Agent (§4, §10). Consumes only `confirmed` findings from the Attack
 * Graph and calls Reporting MCP tools to compile and render. The Gateway denies
 * it any access to Pentester MCP at all (§11).
 */
export class ReportingAgent extends BaseAgent {
  readonly identity = "reporting-agent";
  readonly allowedServers = ["reporting-mcp"];
  readonly allowedModules = ["report"];

  async run(_scanSessionId: string): Promise<{ markdown: string; html: string }> {
    // TODO: compile_report → attach_evidence → export_markdown / export_html
    throw new Error("not implemented");
  }
}
