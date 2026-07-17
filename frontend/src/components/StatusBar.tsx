import type { ConnectionStatus } from "../ws.js";
import type { ScanJob, ScanStatus } from "../types.js";

/**
 * Status bar (§6). Shows live WS connection health and the current scan's
 * lifecycle state at a glance.
 */
export function StatusBar({
  connection,
  scan,
}: {
  connection: ConnectionStatus;
  scan: ScanJob | null;
}) {
  const scanStatus: ScanStatus | null = scan?.status ?? null;

  return (
    <div className="statusbar">
      <span>
        <span className={`dot ${connection}`} />
        WS {connection}
      </span>

      {scan ? (
        <>
          <span>
            Scan <code>{scan.id}</code>
          </span>
          <span>
            Target <code>{scan.target}</code>
          </span>
          {scanStatus && <span className={`pill ${scanStatus}`}>{scanStatus}</span>}
        </>
      ) : (
        <span className="empty" style={{ padding: 0 }}>
          No active scan
        </span>
      )}
    </div>
  );
}
