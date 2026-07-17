import { useNavigate } from "react-router-dom";
import { useStore } from "../lib/store.js";
import { Panel } from "../components/Panel.js";
import { Icon } from "../components/Icon.js";
import { AgentActivity } from "../components/AgentActivity.js";
import { SeverityChip } from "../components/chips.js";
import type { Severity } from "../types.js";

const SEV_META: Array<{ key: Severity; label: string; dot: string; icon: string; hover: string }> = [
  { key: "critical", label: "Critical", dot: "bg-error", icon: "warning", hover: "group-hover:text-error" },
  { key: "high", label: "High", dot: "bg-tertiary", icon: "gpp_maybe", hover: "group-hover:text-tertiary" },
  { key: "medium", label: "Medium", dot: "bg-secondary", icon: "shield", hover: "" },
  { key: "low", label: "Low", dot: "bg-surface-variant", icon: "info", hover: "" },
];

export function Dashboard() {
  const navigate = useNavigate();
  const { scan, events, findings, surface, progress, phase, severityCounts, riskScore } = useStore();

  const running = scan?.status === "running";
  const riskLabel = riskScore >= 75 ? "Critical" : riskScore >= 40 ? "Elevated" : riskScore > 0 ? "Moderate" : "—";
  const recent = [...findings].reverse().slice(0, 6);

  if (!scan) return <EmptyState onStart={() => navigate("/new-scan")} />;

  return (
    <>
      {/* Active Operation bento */}
      <section className="bg-surface-container rounded-xl p-6 md:p-8 ai-border-glow relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="absolute right-0 top-0 w-64 h-64 bg-primary-container/10 blur-3xl rounded-full -z-0 translate-x-1/2 -translate-y-1/2" />
        <div className="flex-1 space-y-4 relative z-10 w-full">
          <div>
            <p className="font-label-md text-label-md text-primary uppercase tracking-widest mb-1">Active Operation</p>
            <h2 className="font-headline-lg text-headline-lg text-on-surface flex items-center gap-3">
              {scan.target}
              {running && (
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-primary-container" />
                </span>
              )}
            </h2>
          </div>
          <div className="space-y-2 max-w-md">
            <div className="flex justify-between font-mono-code text-mono-code text-on-surface-variant">
              <span>Phase: {phase}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-container rounded-full shadow-[0_0_10px_rgba(0,112,243,0.5)] transition-[width] duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <div className="flex gap-8 pt-2">
            <Metric label="Status" value={scan.status} />
            <Metric label="Findings" value={String(findings.length)} />
            <Metric label="Confirmed" value={String(findings.filter((f) => f.status === "confirmed").length)} />
          </div>
        </div>
        <div className="flex-shrink-0 flex flex-col items-center justify-center p-6 bg-surface-container-high rounded-xl border border-outline-variant min-w-[160px] relative z-10">
          <p className="font-label-md text-label-md text-on-surface-variant mb-2 uppercase">Risk Score</p>
          <p className="font-headline-xl text-headline-xl text-error drop-shadow-[0_0_15px_rgba(255,180,171,0.2)]">{riskScore}</p>
          <p className="font-label-md text-label-md text-error mt-1">{riskLabel}</p>
        </div>
      </section>

      {/* Severity summary grid */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {SEV_META.map((s) => (
          <div
            key={s.key}
            className="bg-surface-container border border-outline-variant rounded-xl p-5 hover:bg-surface-container-high transition-colors group cursor-default"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                <h3 className="font-label-md text-label-md text-on-surface-variant uppercase">{s.label}</h3>
              </div>
              <Icon name={s.icon} className="text-on-surface-variant/50" />
            </div>
            <p className={`font-headline-lg text-headline-lg text-on-surface transition-colors ${s.hover}`}>
              {severityCounts[s.key]}
            </p>
          </div>
        ))}
      </section>

      {/* Activity + detail column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-stack-lg">
        <section className="lg:col-span-2 bg-surface-container border border-outline-variant rounded-xl flex flex-col h-96">
          <div className="p-5 border-b border-outline-variant flex justify-between items-center">
            <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
              <Icon name="memory" className="text-primary-container" />
              AI Agent Activity
            </h3>
            <span className="px-2 py-1 rounded bg-primary-container/10 text-primary-container font-mono-code text-[11px] border border-primary-container/20">
              LIVE
            </span>
          </div>
          <AgentActivity events={events} />
        </section>

        <div className="space-y-stack-lg">
          <Panel title="Detected Stack" icon="layers">
            <div className="flex flex-wrap gap-2">
              {(surface?.detectedStack ?? []).length === 0 && (
                <span className="text-on-surface-variant/60 text-[13px]">Awaiting recon…</span>
              )}
              {(surface?.detectedStack ?? []).map((t) => (
                <span
                  key={t}
                  className="px-3 py-1 rounded-full bg-surface-container-high border border-outline-variant text-on-surface font-label-md text-label-md"
                >
                  {t}
                </span>
              ))}
            </div>
          </Panel>

          <Panel title="Surface Snapshot" icon="radar">
            <ul className="space-y-3 font-mono-code text-mono-code">
              <SurfaceRow label="Open Ports" value={surface?.openPorts?.join(", ") ?? "—"} />
              <SurfaceRow
                label="Subdomains"
                value={surface ? `${surface.subdomains} Discovered` : "—"}
                valueClass="text-primary-container"
              />
              <SurfaceRow
                label="WAF Detected"
                value={surface?.wafDetected ?? "—"}
                valueClass="text-tertiary"
                last
              />
            </ul>
          </Panel>
        </div>
      </div>

      {/* Recent discoveries */}
      <Panel title="Recent Discoveries" noPad>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant text-on-surface-variant font-label-md text-label-md uppercase tracking-wider">
                <th className="px-5 py-3 font-medium">Severity</th>
                <th className="px-5 py-3 font-medium">Vulnerability Type</th>
                <th className="px-5 py-3 font-medium">Location</th>
                <th className="px-5 py-3 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody className="font-body-md text-body-md text-on-surface divide-y divide-outline-variant">
              {recent.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-on-surface-variant/60 text-center">
                    No discoveries yet.
                  </td>
                </tr>
              )}
              {recent.map((f) => (
                <tr key={f.id} className="hover:bg-surface-container-high/50 transition-colors">
                  <td className="px-5 py-3">
                    <SeverityChip severity={f.severity} />
                  </td>
                  <td className="px-5 py-3 font-medium">{f.type}</td>
                  <td className="px-5 py-3 font-mono-code text-mono-code text-on-surface-variant">{f.asset}</td>
                  <td className="px-5 py-3 text-right font-mono-code text-[12px] text-on-surface-variant capitalize">
                    {f.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-label-md text-label-md text-on-surface-variant mb-1">{label}</p>
      <p className="font-mono-code text-mono-code text-on-surface capitalize">{value}</p>
    </div>
  );
}

function SurfaceRow({
  label,
  value,
  valueClass = "text-on-surface",
  last = false,
}: {
  label: string;
  value: string;
  valueClass?: string;
  last?: boolean;
}) {
  return (
    <li className={`flex justify-between items-center ${last ? "" : "border-b border-outline-variant pb-2"}`}>
      <span className="text-on-surface-variant">{label}</span>
      <span className={valueClass}>{value}</span>
    </li>
  );
}

function EmptyState({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24 gap-4">
      <div className="w-16 h-16 rounded-xl bg-surface-container border border-outline-variant flex items-center justify-center">
        <Icon name="radar" className="text-primary-container" size={32} />
      </div>
      <h2 className="font-headline-lg text-headline-lg text-on-surface">No active operation</h2>
      <p className="text-on-surface-variant max-w-md">
        Engage a scan to watch the agentic pipeline — recon, scanning, secret detection, and
        independent verification — run live.
      </p>
      <button
        onClick={onStart}
        className="bg-primary-container hover:bg-inverse-primary text-on-primary-container font-label-md text-label-md uppercase tracking-wider px-8 py-3 rounded-lg shadow-[0_4px_14px_0_rgba(0,112,243,0.39)] hover:-translate-y-0.5 transition-all flex items-center gap-2"
      >
        <Icon name="play_arrow" size={18} />
        Initialize Scan
      </button>
    </div>
  );
}
