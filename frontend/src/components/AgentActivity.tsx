import { useEffect, useRef } from "react";
import type { AgentLogKind, ProgressEvent } from "../types.js";

/** Log-kind → tag color (matches the Sentinel AI Agent Activity styling). */
const KIND_COLOR: Record<AgentLogKind, string> = {
  CRAWL: "text-primary-container",
  SCAN: "text-primary-container",
  FUZZ: "text-tertiary",
  ALERT: "text-error",
  VERIFY: "text-success",
  REPORT: "text-primary",
  INFO: "text-secondary",
};

function kindOf(e: ProgressEvent): AgentLogKind {
  if (e.kind) return e.kind;
  // Derive a tag from the stage when the backend didn't classify it.
  switch (e.stage) {
    case "recon":
      return "CRAWL";
    case "scan":
      return "SCAN";
    case "secrets":
      return "SCAN";
    case "verify":
      return "VERIFY";
    case "report":
    case "complete":
      return "REPORT";
    default:
      return "INFO";
  }
}

/** Time label — server ts if present, else a synthetic clock from index. */
function stamp(e: ProgressEvent, i: number): string {
  if (e.ts) {
    const d = new Date(e.ts);
    if (!Number.isNaN(d.getTime())) return d.toLocaleTimeString("en-GB");
  }
  const base = 14 * 3600 + 22 * 60 + i; // 14:22:00 + i, purely cosmetic
  const hh = String(Math.floor(base / 3600) % 24).padStart(2, "0");
  const mm = String(Math.floor(base / 60) % 60).padStart(2, "0");
  const ss = String(base % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

/**
 * Live AI Agent Activity feed (§5). Streams the four-agent pipeline's progress
 * frames as they arrive over the WS gateway. Monospace, auto-scrolls to newest.
 */
export function AgentActivity({ events }: { events: ProgressEvent[] }) {
  const endRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [events.length]);

  return (
    <div className="p-5 flex-1 overflow-y-auto space-y-2.5 font-mono-code text-mono-code">
      {events.length === 0 && (
        <p className="text-on-surface-variant/60">Agent activity will stream here once a scan is engaged.</p>
      )}
      {events.map((e, i) => {
        const kind = kindOf(e);
        const isAlert = kind === "ALERT";
        return (
          <div
            key={i}
            className="flex gap-4 items-start text-on-surface-variant hover:bg-surface-container-high p-1 -mx-1 rounded transition-colors"
          >
            <span className="text-secondary opacity-50 shrink-0">{stamp(e, i)}</span>
            <span className={`${KIND_COLOR[kind]} shrink-0 w-16`}>[{kind}]</span>
            <span className={`break-all ${isAlert ? "text-error font-medium" : "text-on-surface"}`}>
              {e.message}
            </span>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}
