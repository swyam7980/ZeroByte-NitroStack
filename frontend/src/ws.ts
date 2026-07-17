import { useEffect, useRef, useState } from "react";
import type { ProgressEvent } from "./types.js";

/** Subscribe to the backend WS gateway for live progress (§5, §6). */
export function useScanSocket(): ProgressEvent[] {
  const [events, setEvents] = useState<ProgressEvent[]>([]);
  const ref = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(`ws://${location.host}/ws`);
    ref.current = ws;
    ws.onmessage = (e) => {
      try {
        setEvents((prev) => [...prev, JSON.parse(e.data) as ProgressEvent]);
      } catch { /* ignore malformed frame */ }
    };
    return () => ws.close();
  }, []);

  return events;
}
