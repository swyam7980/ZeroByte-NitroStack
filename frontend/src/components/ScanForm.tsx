import { useState } from "react";

/**
 * Start-scan form (§13 MVP: start scan). Disabled while a scan is in flight so
 * the operator can't double-submit. Surfaces submit errors inline.
 */
export function ScanForm({
  onStart,
  busy,
  error,
}: {
  onStart: (target: string) => void;
  busy: boolean;
  error?: string | null;
}) {
  const [target, setTarget] = useState("");

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>New scan</h2>
      </div>
      <div className="panel-body">
        <form
          className="scan-form"
          onSubmit={(e) => {
            e.preventDefault();
            const t = target.trim();
            if (t && !busy) onStart(t);
          }}
        >
          <input
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="target host or URL (must be in scope.yaml)"
            disabled={busy}
            spellCheck={false}
            autoComplete="off"
          />
          <button type="submit" disabled={busy || !target.trim()}>
            {busy ? "Scanning…" : "Start scan"}
          </button>
        </form>
        {error && <p className="form-error">{error}</p>}
      </div>
    </div>
  );
}
