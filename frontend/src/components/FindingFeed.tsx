import { useEffect, useRef } from "react";
import type { ProgressEvent } from "../types.js";

/**
 * Live activity log (§5, §13 MVP: live finding feed). Renders every progress
 * frame streamed over the WS gateway as each pipeline stage completes.
 * Auto-scrolls to the newest line.
 */
export function ActivityLog({ events }: { events: ProgressEvent[] }) {
  const endRef = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [events.length]);

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Live activity</h2>
        <span className="count-chip">{events.length}</span>
      </div>
      <div className="panel-body scroll">
        {events.length === 0 ? (
          <p className="empty">No events yet — start a scan to see the pipeline run.</p>
        ) : (
          <ul className="log">
            {events.map((e, i) => (
              <li key={i} ref={i === events.length - 1 ? endRef : undefined}>
                <span className={`stage-tag ${e.stage}`}>{e.stage}</span>
                <span className="msg">{e.message}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
