import type { Severity, FindingStatus } from "../types.js";

/** Maps severity → Sentinel palette tokens (§10). */
const SEV: Record<Severity, { text: string; border: string; bg: string; dot: string; label: string }> = {
  critical: { text: "text-error", border: "border-error", bg: "bg-error/10", dot: "bg-error", label: "Critical" },
  high: { text: "text-tertiary", border: "border-tertiary", bg: "bg-tertiary/10", dot: "bg-tertiary", label: "High" },
  medium: { text: "text-secondary", border: "border-secondary", bg: "bg-secondary/10", dot: "bg-secondary", label: "Medium" },
  low: { text: "text-on-surface-variant", border: "border-outline", bg: "bg-surface-variant/20", dot: "bg-outline", label: "Low" },
  info: { text: "text-on-surface-variant", border: "border-outline-variant", bg: "bg-surface-variant/20", dot: "bg-outline", label: "Info" },
};

export function SeverityChip({ severity }: { severity: Severity }) {
  const s = SEV[severity];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full ${s.bg} border ${s.border} ${s.text} font-label-md text-[11px] uppercase tracking-wide`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

/** Verification lifecycle chip (§9) — ZeroByte's differentiator, front and centre. */
const STATUS: Record<FindingStatus, { text: string; border: string; bg: string; label: string; icon: string }> = {
  candidate: { text: "text-on-surface-variant", border: "border-outline-variant", bg: "bg-surface-variant/20", label: "Candidate", icon: "help" },
  verifying: { text: "text-tertiary", border: "border-tertiary/40", bg: "bg-tertiary/10", label: "Verifying", icon: "hourglass_top" },
  confirmed: { text: "text-success", border: "border-success/40", bg: "bg-success/10", label: "Confirmed", icon: "verified" },
  unconfirmed: { text: "text-on-surface-variant", border: "border-outline-variant", bg: "bg-surface-variant/10", label: "Dropped", icon: "block" },
};

export function VerificationStatusChip({ status }: { status: FindingStatus }) {
  const s = STATUS[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full ${s.bg} border ${s.border} ${s.text} font-label-md text-[11px]`}
    >
      <span className="material-symbols-outlined text-[13px]" aria-hidden="true">
        {s.icon}
      </span>
      {s.label}
    </span>
  );
}
