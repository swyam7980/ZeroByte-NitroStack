import { Injectable } from "@nitrostack/core";
import type { Finding } from "@zerobyte/shared";

/**
 * Report rendering (§10). Groups confirmed findings, scores severity, renders
 * Markdown → HTML, bundles evidence by artifact reference.
 */
export interface ReportModel {
  id: string;
  scanSessionId: string;
  generatedAt: string;
  findings: Finding[];
  groupedBySeverity: Record<string, Finding[]>;
}

@Injectable()
export class ReportService {
  compile(_scanSessionId: string, _confirmed: Finding[]): ReportModel { throw new Error("not implemented"); }
  toMarkdown(_model: ReportModel): string { throw new Error("not implemented"); }
  toHtml(_markdown: string): string { throw new Error("not implemented"); }
}
