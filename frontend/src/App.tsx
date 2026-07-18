import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import { StoreProvider } from "./lib/store.js";
import { Layout } from "./components/Layout.js";
import { Dashboard } from "./pages/Dashboard.js";
import { NewScan } from "./pages/NewScan.js";
import { Findings } from "./pages/Findings.js";
import { NitroChat } from "./pages/NitroChat.js";
import { Reports } from "./pages/Reports.js";
import { Settings } from "./pages/Settings.js";

/**
 * ZeroByte dashboard — Sentinel Intelligence System design over the agentic
 * pentester. Routes share one <StoreProvider> so the live WS scan state (§5) is
 * consistent across Dashboard / Findings / Reports.
 */
export function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="new-scan" element={<NewScan />} />
            <Route path="findings" element={<Findings />} />
            <Route path="reports" element={<Reports />} />
            <Route path="nitrochat" element={<NitroChat />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  );
}
