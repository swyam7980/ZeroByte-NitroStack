import type { Finding, Severity } from "../types.js";

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

/**
 * Findings table (§10). Shows every finding surfaced during the scan, sorted by
 * severity then status. Rows update in place as a `candidate` is verified into
 * `confirmed` / `unconfirmed` (§9) — the WS hook merges by id.
 */
export function FindingsTable({ findings }: { findings: Finding[] }) {
  const sorted = [...findings].sort(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity],
  );
  const confirmed = findings.filter((f) => f.status === "confirmed").length;

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Findings</h2>
        <span className="count-chip">
          {confirmed} confirmed / {findings.length} total
        </span>
      </div>
      <div className="panel-body scroll">
        {findings.length === 0 ? (
          <p className="empty">Findings will appear here as scanners surface candidates.</p>
        ) : (
          <table className="findings">
            <thead>
              <tr>
                <th>Severity</th>
                <th>Finding</th>
                <th>Status</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((f) => (
                <tr key={f.id}>
                  <td>
                    <span className={`sev ${f.severity}`}>{f.severity}</span>
                  </td>
                  <td>
                    <div className="finding-type">{f.type}</div>
                    <div className="finding-asset">{f.asset}</div>
                  </td>
                  <td>
                    <span className={`status-badge ${f.status}`}>{f.status}</span>
                  </td>
                  <td>
                    <div className="conf-bar" title={`${Math.round(f.confidence * 100)}%`}>
                      <span style={{ width: `${Math.round(f.confidence * 100)}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
