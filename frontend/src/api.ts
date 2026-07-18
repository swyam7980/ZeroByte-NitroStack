import type { ScanJob, ScanProfile, ReportPayload } from "./types.js";

/**
 * REST client for scan CRUD (§6). In local dev the Vite proxy forwards /api
 * to the backend. On Vercel (separate projects) set VITE_API_URL to the
 * backend's full URL (e.g. https://backend.vercel.app).
 */

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    let detail = "";
    try {
      detail = JSON.stringify(await res.json());
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(`${init?.method ?? "GET"} ${path} → ${res.status}`, res.status, detail);
  }
  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly detail?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface StartScanInput {
  target: string;
  profile?: ScanProfile;
  scopeRef?: string;
  auth?: { bearer?: string; cookie?: string };
}

export const api = {
  /** Start a scan. Backend enqueues it and streams progress over WS (§5, §6). */
  startScan(input: StartScanInput): Promise<ScanJob> {
    return request<ScanJob>("/scans", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  /** List all scans this session. */
  listScans(): Promise<{ scans: ScanJob[] }> {
    return request<{ scans: ScanJob[] }>("/scans");
  },

  /** Fetch a single scan's status. */
  getScan(id: string): Promise<ScanJob> {
    return request<ScanJob>(`/scans/${encodeURIComponent(id)}`);
  },

  /** Fetch the rendered report once the scan completes (§10). */
  getReport(id: string): Promise<ReportPayload> {
    return request<ReportPayload>(`/scans/${encodeURIComponent(id)}/report`);
  },
};
