import type { ScanJob } from "./types.js";

/** REST client for scan CRUD (§6). */
export const api = {
  async startScan(target: string): Promise<ScanJob> {
    const res = await fetch("/api/scans", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ target }),
    });
    if (!res.ok) throw new Error(`startScan failed: ${res.status}`);
    return res.json();
  },

  async getReport(scanId: string): Promise<{ html: string }> {
    const res = await fetch(`/api/scans/${scanId}/report`);
    if (!res.ok) throw new Error(`getReport failed: ${res.status}`);
    return res.json();
  },
};
