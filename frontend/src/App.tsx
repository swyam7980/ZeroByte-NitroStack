import { useState } from "react";
import { api } from "./api.js";
import { useScanSocket } from "./ws.js";
import { ScanForm } from "./components/ScanForm.js";
import { FindingFeed } from "./components/FindingFeed.js";
import { ReportView } from "./components/ReportView.js";

export function App() {
  const events = useScanSocket();
  const [reportHtml, setReportHtml] = useState<string | null>(null);
  const [scanId, setScanId] = useState<string | null>(null);

  async function startScan(target: string) {
    const job = await api.startScan(target);
    setScanId(job.id);
    setReportHtml(null);
  }

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", maxWidth: 900, margin: "40px auto", padding: 16 }}>
      <h1>ZeroByte — Agentic Pentester</h1>
      <p style={{ opacity: 0.7 }}>MCP-first. Every capability is a scope-checked tool.</p>
      <ScanForm onStart={startScan} />
      {scanId && <p>Scan: <code>{scanId}</code></p>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 24 }}>
        <FindingFeed events={events} />
        <ReportView html={reportHtml} />
      </div>
    </main>
  );
}
