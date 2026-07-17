import type { ProgressEvent } from "../types.js";

/** Live finding/progress feed (§5, §13 MVP: live finding feed). */
export function FindingFeed({ events }: { events: ProgressEvent[] }) {
  return (
    <div>
      <h2>Live feed</h2>
      {events.length === 0 && <p style={{ opacity: 0.6 }}>No events yet — start a scan.</p>}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {events.map((e, i) => (
          <li key={i} style={{ padding: "4px 0", borderBottom: "1px solid #eee" }}>
            <code style={{ marginRight: 8 }}>[{e.stage}]</code>
            {e.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
