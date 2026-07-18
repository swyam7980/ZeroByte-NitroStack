import { useMemo } from "react";
import { useStore } from "../lib/store.js";
import { Icon } from "../components/Icon.js";
import { SeverityChip } from "../components/chips.js";
import type { Finding, Severity } from "../types.js";

const SEV_ORDER: Severity[] = ["critical", "high", "medium", "low", "info"];
const BAR_COLOR: Record<Severity, string> = {
  critical: "bg-error/80 hover:bg-error",
  high: "bg-tertiary/80 hover:bg-tertiary",
  medium: "bg-[#F5A623]/80 hover:bg-[#F5A623]",
  low: "bg-success/80 hover:bg-success",
  info: "bg-outline-variant/80 hover:bg-outline-variant",
};

/** Grade from risk score (§10). */
function grade(score: number): { grade: string; note: string } {
  if (score >= 75) return { grade: "D", note: "High risk exposure." };
  if (score >= 50) return { grade: "C", note: "Elevated risk exposure." };
  if (score >= 25) return { grade: "B+", note: "Moderate risk exposure." };
  if (score > 0) return { grade: "A-", note: "Low risk exposure." };
  return { grade: "A", note: "No confirmed exposure." };
}

export function Reports() {
  const { confirmedFindings, scan, riskScore } = useStore();

  const dist = useMemo(() => {
    const d = Object.fromEntries(SEV_ORDER.map((s) => [s, 0])) as Record<Severity, number>;
    for (const f of confirmedFindings) d[f.severity] += 1;
    return d;
  }, [confirmedFindings]);
  const maxBar = Math.max(1, ...SEV_ORDER.map((s) => dist[s]));
  const g = grade(riskScore);
  const target = scan?.target ?? "target";

  return (
    <>
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface mb-1">Executive Report</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {scan ? `Generated for ${target}` : "Run a scan to generate a report."} · confirmed findings only (§10)
          </p>
        </div>
        <div className="flex gap-stack-sm">
          <ExportButton icon="download" label="JSON" />
          <ExportButton icon="download" label="Markdown" />
          <button className="bg-primary-container text-on-primary-container px-4 py-2 rounded text-body-md hover:bg-inverse-primary transition-colors flex items-center gap-2">
            <Icon name="picture_as_pdf" size={18} />
            Export PDF
          </button>
        </div>
      </div>

      {/* Grade + distribution */}
      <div className="grid grid-cols-12 gap-stack-md">
        <div className="col-span-12 md:col-span-4 bg-surface-container border border-outline-variant rounded-lg p-gutter flex flex-col justify-center items-center relative overflow-hidden">
          <div className="absolute inset-0 bg-primary/5" />
          <h3 className="font-headline-md text-headline-md text-on-surface-variant mb-2 relative z-10">Security Grade</h3>
          <div className="text-[80px] font-bold text-primary leading-none relative z-10 mb-2">{g.grade}</div>
          <p className="font-body-md text-body-md text-on-surface-variant text-center relative z-10">
            Risk score: {riskScore}/100
            <br />
            {g.note}
          </p>
        </div>

        <div className="col-span-12 md:col-span-8 bg-surface-container border border-outline-variant rounded-lg p-gutter">
          <h3 className="font-headline-md text-headline-md font-bold mb-stack-md">Confirmed Vulnerability Distribution</h3>
          <div className="h-56 flex items-end justify-between gap-4 px-4 pb-4 border-b border-outline-variant">
            {SEV_ORDER.map((s) => (
              <div key={s} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <span className="font-mono-code text-[12px] text-on-surface-variant">{dist[s]}</span>
                <div
                  className={`w-full rounded-t transition-colors ${BAR_COLOR[s]}`}
                  style={{ height: `${(dist[s] / maxBar) * 100}%`, minHeight: dist[s] > 0 ? 6 : 2 }}
                />
                <span className="font-mono-code text-[10px] text-on-surface-variant uppercase">{s.slice(0, 4)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Report body + AI summary */}
      <div className="grid grid-cols-12 gap-stack-md">
        <div className="col-span-12 lg:col-span-8 bg-surface-container border border-outline-variant rounded-lg overflow-hidden flex flex-col">
          <div className="bg-surface-container-high p-3 border-b border-outline-variant flex items-center gap-2">
            <Icon name="description" className="text-on-surface-variant" />
            <span className="font-mono-code text-mono-code text-on-surface">
              {target.replace(/[^a-z0-9]/gi, "_")}_exec_summary.md
            </span>
          </div>
          <div className="p-stack-lg space-y-5">
            <ReportSection n="1" title="Executive Summary">
              <p>
                This report details the confirmed findings of an agentic security assessment of{" "}
                <strong>{target}</strong>. Candidates surfaced by the Recon &amp; Exploitation agent were
                independently reproduced by the Verification agent in fresh execution contexts; only reproduced
                findings appear below.
              </p>
              <p>
                Overall posture is graded <strong>{g.grade}</strong> ({g.note.toLowerCase()})
              </p>
            </ReportSection>

            <ReportSection n="2" title="Key Findings">
              {confirmedFindings.length === 0 ? (
                <p className="text-on-surface-variant/70">No findings survived independent verification yet.</p>
              ) : (
                <ul className="space-y-2">
                  {[...confirmedFindings]
                    .sort((a, b) => SEV_ORDER.indexOf(a.severity) - SEV_ORDER.indexOf(b.severity))
                    .map((f) => (
                      <li key={f.id} className="flex items-start gap-3">
                        <SeverityChip severity={f.severity} />
                        <div>
                          <span className="font-medium">{f.type}</span>{" "}
                          <span className="font-mono-code text-[12px] text-on-surface-variant">— {f.asset}</span>
                          <p className="text-on-surface-variant text-[13px]">{f.description}</p>
                        </div>
                      </li>
                    ))}
                </ul>
              )}
            </ReportSection>

            <div className="bg-surface-dim p-4 border-l-4 border-primary-container rounded text-[13px]">
              <p className="font-bold mb-1 text-on-surface">Confidentiality Notice</p>
              <p className="text-on-surface-variant">
                Generated by ZeroByte's privilege-free Reporting MCP from confirmed Attack-Graph entries only. Do
                not distribute without authorization.
              </p>
            </div>
          </div>
        </div>

        {/* AI summary */}
        <div className="col-span-12 lg:col-span-4 ai-border-glow rounded-lg p-stack-md bg-surface-container flex flex-col">
          <div className="flex items-center gap-2 mb-stack-md">
            <Icon name="auto_awesome" className="text-primary" />
            <h3 className="font-headline-md text-headline-md font-bold text-on-surface">AI Summary</h3>
          </div>
          <div className="flex-1 space-y-stack-md">
            <AiCard title="Primary Risk Vector">
              {topRisk(confirmedFindings) ??
                "No confirmed critical/high vector — the highest-impact reproduced finding will be summarised here."}
            </AiCard>
            <AiCard title="Verification Outcome">
              {`${confirmedFindings.length} finding(s) reproduced in a fresh context and confirmed; candidates that failed to reproduce were dropped to keep the report false-positive-free.`}
            </AiCard>
            <AiCard title="Recommended Action">
              Prioritise remediation by severity, then re-run a Standard Audit to confirm closure against the same
              scope.
            </AiCard>
          </div>
          <button className="mt-stack-md pt-stack-md border-t border-outline-variant w-full text-on-surface hover:text-primary transition-colors py-2 flex items-center justify-center gap-2 font-label-md text-label-md">
            <Icon name="refresh" size={16} />
            Regenerate Insights
          </button>
        </div>
      </div>
    </>
  );
}

function topRisk(findings: Finding[]): string | null {
  const top = findings.find((f) => f.severity === "critical") ?? findings.find((f) => f.severity === "high");
  if (!top) return null;
  return `${top.type} at ${top.asset} poses the highest immediate threat (${Math.round(
    top.confidence * 100,
  )}% confidence). Prioritise remediation and add a guard rule before the code patch ships.`;
}

function ReportSection({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-headline-md text-headline-md font-bold mb-2 text-on-surface">
        {n}. {title}
      </h3>
      <div className="space-y-3 text-body-md text-on-surface-variant leading-relaxed">{children}</div>
    </div>
  );
}

function AiCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface-container-high p-stack-sm rounded border border-outline-variant">
      <h4 className="font-label-md text-label-md text-primary mb-1">{title}</h4>
      <p className="font-body-md text-[13px] text-on-surface-variant">{children}</p>
    </div>
  );
}

function ExportButton({ icon, label }: { icon: string; label: string }) {
  return (
    <button className="border border-outline-variant bg-transparent text-on-surface hover:bg-surface-container-high px-4 py-2 rounded text-body-md transition-colors flex items-center gap-2">
      <Icon name={icon} size={18} />
      {label}
    </button>
  );
}
