import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../lib/store.js";
import { Icon } from "../components/Icon.js";
import { SeverityChip, VerificationStatusChip } from "../components/chips.js";
import type { Finding, FindingStatus, Severity } from "../types.js";

const SEVERITY_RANK: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

type StatusFilter = "all" | FindingStatus;

const FILTERS: Array<{ key: StatusFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "confirmed", label: "Confirmed" },
  { key: "verifying", label: "Verifying" },
  { key: "candidate", label: "Candidates" },
  { key: "unconfirmed", label: "Dropped" },
];

export function Findings() {
  const navigate = useNavigate();
  const { findings, scan } = useStore();
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [selected, setSelected] = useState<Finding | null>(null);

  const rows = useMemo(() => {
    const list = filter === "all" ? findings : findings.filter((f) => f.status === filter);
    return [...list].sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
  }, [findings, filter]);

  const counts = useMemo(() => {
    const c: Record<StatusFilter, number> = { all: findings.length, candidate: 0, verifying: 0, confirmed: 0, unconfirmed: 0 };
    for (const f of findings) c[f.status] += 1;
    return c;
  }, [findings]);

  return (
    <>
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface mb-1">Findings</h2>
          <p className="text-on-surface-variant font-body-md text-body-md">
            Every candidate is independently reproduced in a fresh context before it's confirmed (§9).
          </p>
        </div>
        <div className="flex gap-1 bg-surface-container border border-outline-variant rounded-lg p-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded text-[13px] font-medium transition-colors ${
                filter === f.key
                  ? "bg-surface-variant/40 text-primary"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {f.label}
              <span className="ml-1.5 text-[11px] opacity-60">{counts[f.key]}</span>
            </button>
          ))}
        </div>
      </div>

      {!scan ? (
        <EmptyFindings onStart={() => navigate("/new-scan")} />
      ) : (
        <section className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant text-on-surface-variant font-label-md text-label-md uppercase tracking-wider bg-surface-container-high/40">
                  <th className="px-5 py-3 font-medium">Severity</th>
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 font-medium">Location</th>
                  <th className="px-5 py-3 font-medium">Verification</th>
                  <th className="px-5 py-3 font-medium">Confidence</th>
                  <th className="px-5 py-3 font-medium">Source</th>
                </tr>
              </thead>
              <tbody className="font-body-md text-body-md text-on-surface divide-y divide-outline-variant">
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-on-surface-variant/60">
                      No findings in this view yet.
                    </td>
                  </tr>
                )}
                {rows.map((f) => (
                  <tr
                    key={f.id}
                    onClick={() => setSelected(f)}
                    className="hover:bg-surface-container-high/50 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-3">
                      <SeverityChip severity={f.severity} />
                    </td>
                    <td className="px-5 py-3 font-medium">{f.type}</td>
                    <td className="px-5 py-3 font-mono-code text-mono-code text-on-surface-variant">{f.asset}</td>
                    <td className="px-5 py-3">
                      <VerificationStatusChip status={f.status} />
                    </td>
                    <td className="px-5 py-3">
                      <ConfidenceBar value={f.confidence} status={f.status} />
                    </td>
                    <td className="px-5 py-3 font-mono-code text-[12px] text-on-surface-variant">{f.discoveredBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {selected && <FindingDrawer finding={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

function ConfidenceBar({ value, status }: { value: number; status: FindingStatus }) {
  if (status === "candidate") return <span className="text-on-surface-variant/50 text-[12px]">—</span>;
  const pct = Math.round(value * 100);
  const color = status === "confirmed" ? "bg-success" : status === "verifying" ? "bg-tertiary" : "bg-outline";
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-1.5 w-16 bg-surface-container-high rounded-full overflow-hidden">
        <div className={`absolute inset-y-0 left-0 ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono-code text-[12px] text-on-surface-variant">{pct}%</span>
    </div>
  );
}

function FindingDrawer({ finding, onClose }: { finding: Finding; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-surface-container-low border-l border-outline-variant h-full overflow-y-auto p-6 space-y-5">
        <div className="flex justify-between items-start">
          <SeverityChip severity={finding.severity} />
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface">
            <Icon name="close" />
          </button>
        </div>
        <div>
          <h3 className="font-headline-md text-headline-md text-on-surface">{finding.type}</h3>
          <p className="font-mono-code text-mono-code text-on-surface-variant mt-1">{finding.asset}</p>
        </div>
        <div className="flex items-center gap-2">
          <VerificationStatusChip status={finding.status} />
          {finding.status !== "candidate" && (
            <span className="font-mono-code text-[12px] text-on-surface-variant">
              {Math.round(finding.confidence * 100)}% confidence
            </span>
          )}
        </div>
        <Field label="Description">{finding.description}</Field>
        <Field label="Discovered by">
          <span className="font-mono-code">{finding.discoveredBy}</span>
        </Field>
        {finding.verificationTranscript && (
          <Field label="Verification Transcript">
            <pre className="font-mono-code text-[12px] text-on-surface-variant whitespace-pre-wrap bg-surface-dim border border-outline-variant rounded p-3">
              {finding.verificationTranscript}
            </pre>
          </Field>
        )}
        {finding.evidence && finding.evidence.length > 0 && (
          <Field label="Evidence">
            <ul className="space-y-1">
              {finding.evidence.map((e) => (
                <li key={e.id} className="font-mono-code text-[12px] text-primary-container">
                  {e.kind} · {e.artifactUri}
                </li>
              ))}
            </ul>
          </Field>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-1.5">{label}</p>
      <div className="text-on-surface text-body-md">{children}</div>
    </div>
  );
}

function EmptyFindings({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24 gap-4">
      <Icon name="security" className="text-on-surface-variant/40" size={40} />
      <p className="text-on-surface-variant max-w-md">No scan has run yet. Findings appear here as scanners surface candidates and the Verification agent confirms them.</p>
      <button
        onClick={onStart}
        className="bg-primary-container hover:bg-inverse-primary text-on-primary-container font-label-md text-label-md uppercase tracking-wider px-6 py-2.5 rounded-lg transition-colors flex items-center gap-2"
      >
        <Icon name="play_arrow" size={18} />
        Start a scan
      </button>
    </div>
  );
}
