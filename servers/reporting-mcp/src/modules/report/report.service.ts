import { Injectable } from "@nitrostack/core";
import { nowIso, type Finding, type Severity } from "@zerobyte/shared";

/**
 * Report rendering (§10). Groups confirmed findings, scores severity, renders
 * Markdown (source of truth) → HTML, and computes the dashboard grade/score the
 * frontend's ReportPayload expects. No live-target privilege here at all.
 */
export interface ReportModel {
  id: string;
  scanSessionId: string;
  generatedAt: string;
  findings: Finding[];
  groupedBySeverity: Record<Severity, Finding[]>;
  score: number; // 0..100 (100 = clean)
  grade: string; // e.g. "A", "B+"
}

const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low", "info"];
const SEVERITY_WEIGHT: Record<Severity, number> = { critical: 40, high: 20, medium: 8, low: 3, info: 0 };

@Injectable()
export class ReportService {
  compile(scanSessionId: string, confirmed: Finding[]): ReportModel {
    const groupedBySeverity = Object.fromEntries(SEVERITY_ORDER.map((s) => [s, [] as Finding[]])) as Record<Severity, Finding[]>;
    for (const f of confirmed) groupedBySeverity[f.severity].push(f);

    const penalty = confirmed.reduce((sum, f) => sum + SEVERITY_WEIGHT[f.severity] * (0.5 + 0.5 * f.confidence), 0);
    const score = Math.max(0, Math.round(100 - penalty));
    return {
      id: `report_${scanSessionId}`,
      scanSessionId,
      generatedAt: nowIso(),
      findings: confirmed,
      groupedBySeverity,
      score,
      grade: this.grade(score),
    };
  }

  /** CVSS-inspired severity bucket: impact × exploitability × confidence (§10). */
  scoreSeverity(finding: Finding): { severity: Severity; numeric: number } {
    const base = SEVERITY_WEIGHT[finding.severity] / 40; // 0..1
    const numeric = Number((base * (0.5 + 0.5 * finding.confidence) * 10).toFixed(1));
    return { severity: finding.severity, numeric };
  }

  toMarkdown(model: ReportModel): string {
    const lines: string[] = [];
    lines.push(`# Penetration Test Report`);
    lines.push("");
    lines.push(`**Scan session:** ${model.scanSessionId}`);
    lines.push(`**Generated:** ${model.generatedAt}`);
    lines.push(`**Security grade:** ${model.grade} (${model.score}/100)`);
    lines.push(`**Confirmed findings:** ${model.findings.length}`);
    lines.push("");

    lines.push(`## Summary by severity`);
    lines.push("");
    lines.push(`| Severity | Count |`);
    lines.push(`| --- | --- |`);
    for (const sev of SEVERITY_ORDER) {
      lines.push(`| ${sev} | ${model.groupedBySeverity[sev].length} |`);
    }
    lines.push("");

    if (model.findings.length === 0) {
      lines.push(`_No confirmed findings. All candidates were filtered by verification._`);
      return lines.join("\n");
    }

    for (const sev of SEVERITY_ORDER) {
      const group = model.groupedBySeverity[sev];
      if (!group.length) continue;
      lines.push(`## ${sev.toUpperCase()} findings`);
      lines.push("");
      for (const f of group) {
        lines.push(`### ${f.type} — ${f.asset}`);
        lines.push("");
        lines.push(`- **Confidence:** ${(f.confidence * 100).toFixed(0)}%`);
        lines.push(`- **Discovered by:** ${f.discoveredBy}`);
        if (f.verifiedAt) lines.push(`- **Verified at:** ${f.verifiedAt}`);
        lines.push(`- **Evidence:** ${f.evidence.map((e) => `${e.kind}(${e.artifactUri})`).join(", ") || "—"}`);
        lines.push("");
        lines.push(f.description);
        if (f.verificationTranscript) {
          lines.push("");
          lines.push("```");
          lines.push(f.verificationTranscript);
          lines.push("```");
        }
        lines.push("");
      }
    }
    return lines.join("\n");
  }

  /** Minimal, dependency-free Markdown → HTML for the dashboard view. */
  toHtml(markdown: string): string {
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const body = markdown
      .split("\n")
      .map((line) => {
        if (line.startsWith("### ")) return `<h3>${esc(line.slice(4))}</h3>`;
        if (line.startsWith("## ")) return `<h2>${esc(line.slice(3))}</h2>`;
        if (line.startsWith("# ")) return `<h1>${esc(line.slice(2))}</h1>`;
        if (line.startsWith("- ")) return `<li>${this.inline(esc(line.slice(2)))}</li>`;
        if (line.startsWith("| ")) return `<div class="row">${esc(line)}</div>`;
        if (line.trim() === "") return "";
        return `<p>${this.inline(esc(line))}</p>`;
      })
      .join("\n");
    return `<!doctype html><html><head><meta charset="utf-8"><title>ZeroByte Report</title></head><body>${body}</body></html>`;
  }

  private inline(s: string): string {
    return s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  }

  private grade(score: number): string {
    if (score >= 95) return "A";
    if (score >= 90) return "A-";
    if (score >= 85) return "B+";
    if (score >= 80) return "B";
    if (score >= 70) return "C";
    if (score >= 60) return "D";
    return "F";
  }
}
