import type { ProgressEvent } from "./types.js";

export type ConnectionStatus = "connecting" | "open" | "closed";

export interface SocketHandle {
  close: () => void;
}

/**
 * Derive the WebSocket URL from the API base so it works in both local dev
 * (same-origin /ws proxied by Vite) and on Vercel (cross-origin backend).
 */
function wsUrl(): string {
  const apiBase = (import.meta.env.VITE_API_URL as string | undefined) ?? "";
  if (apiBase) {
    // Cross-origin: replace https:// → wss://
    return apiBase.replace(/^http/, "ws") + "/ws";
  }
  // Same-origin (local dev with Vite proxy)
  const proto = location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${location.host}/ws`;
}

/**
 * Open a resilient connection to the backend WS gateway (§5, §6).
 *
 * Plain (non-hook) helper so the app store can own a single socket. Auto-
 * reconnects with capped backoff; surfaces connection state and every parsed
 * `ProgressEvent`. Malformed frames are ignored.
 *
 * NOTE: WebSockets do not work on Vercel serverless. This client will
 * gracefully retry and remain in a "connecting" state — the app should
 * fall back to polling when the socket never opens.
 */
export function openScanSocket(
  onEvent: (e: ProgressEvent) => void,
  onStatus: (s: ConnectionStatus) => void,
): SocketHandle {
  let ws: WebSocket | null = null;
  let retries = 0;
  let closedByUs = false;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;

  function connect() {
    onStatus("connecting");
    try {
      ws = new WebSocket(wsUrl());
    } catch {
      scheduleRetry();
      return;
    }

    ws.onopen = () => {
      retries = 0;
      onStatus("open");
    };

    ws.onmessage = (e) => {
      let evt: ProgressEvent;
      try {
        evt = JSON.parse(e.data) as ProgressEvent;
      } catch {
        return; // ignore malformed frame
      }
      onEvent(evt);
    };

    ws.onclose = () => {
      onStatus("closed");
      if (!closedByUs) scheduleRetry();
    };

    ws.onerror = () => ws?.close();
  }

  function scheduleRetry() {
    const delay = Math.min(5000, 500 * 2 ** retries);
    retries += 1;
    retryTimer = setTimeout(connect, delay);
  }

  connect();

  return {
    close() {
      closedByUs = true;
      if (retryTimer) clearTimeout(retryTimer);
      ws?.close();
    },
  };
}
