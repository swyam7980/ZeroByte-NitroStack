import { useState } from "react";

/** Start scan form (§13 MVP: start scan). */
export function ScanForm({ onStart }: { onStart: (target: string) => void }) {
  const [target, setTarget] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (target.trim()) onStart(target.trim());
      }}
    >
      <input
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        placeholder="target (must be in scope.yaml)"
        style={{ width: 320, padding: 8 }}
      />
      <button type="submit" style={{ padding: 8, marginLeft: 8 }}>
        Start scan
      </button>
    </form>
  );
}
