import { Icon } from "./Icon.js";
import { useStore } from "../lib/store.js";

/** Maps WS connection state → the status dot in the top bar. */
const CONN = {
  open: { color: "bg-success", label: "Gateway live" },
  connecting: { color: "bg-tertiary", label: "Connecting…" },
  closed: { color: "bg-error", label: "Gateway offline" },
} as const;

/**
 * Top navigation bar. Shows the active operation context (target being scanned)
 * plus live gateway connection health (§6).
 */
export function TopBar() {
  const { scan, connection, demoMode } = useStore();
  const conn = CONN[connection];

  return (
    <header className="sticky top-0 z-20 flex justify-between items-center w-full px-gutter h-16 border-b border-outline-variant bg-surface">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-on-surface-variant font-label-md text-label-md shrink-0">
          Active Context:
        </span>
        {scan ? (
          <span className="text-primary font-bold truncate">Scanning {scan.target}</span>
        ) : (
          <span className="text-on-surface-variant">No active operation</span>
        )}
        {demoMode && (
          <span className="ml-2 px-2 py-0.5 rounded-full bg-tertiary/10 text-tertiary border border-tertiary/30 text-[10px] font-bold uppercase tracking-wider shrink-0">
            Demo
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 text-on-surface-variant">
        <span className="hidden sm:flex items-center gap-2 text-[12px] font-mono-code">
          <span className={`w-2 h-2 rounded-full ${conn.color}`} />
          {conn.label}
        </span>
        <button className="hover:text-primary transition-colors hover:scale-110 duration-150 relative">
          <Icon name="notifications" />
          <span className="absolute top-0 right-0 w-2 h-2 bg-primary-container rounded-full" />
        </button>
        <button className="hover:text-primary transition-colors hover:scale-110 duration-150">
          <Icon name="account_circle" />
        </button>
      </div>
    </header>
  );
}
