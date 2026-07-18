import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api, ApiError, type StartScanInput } from "../api.js";
import { openScanSocket, type ConnectionStatus } from "../ws.js";
import type {
  Finding,
  ProgressEvent,
  ScanJob,
  Severity,
  SurfaceSnapshot,
} from "../types.js";
import { buildDemoRun, demoScan, DEMO_SURFACE } from "./demo.js";

const EMPTY_COUNTS: Record<Severity, number> = {
  critical: 0,
  high: 0,
  medium: 0,
  low: 0,
  info: 0,
};

interface StoreValue {
  connection: ConnectionStatus;
  scan: ScanJob | null;
  events: ProgressEvent[];
  findings: Finding[];
  surface: SurfaceSnapshot | null;
  progress: number;
  phase: string;
  /** True while running against the built-in demo simulation, not a live backend. */
  demoMode: boolean;
  severityCounts: Record<Severity, number>;
  riskScore: number;
  confirmedFindings: Finding[];
  startScan: (input: StartScanInput) => Promise<void>;
  startError: string | null;
  busy: boolean;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [connection, setConnection] = useState<ConnectionStatus>("connecting");
  const [scan, setScan] = useState<ScanJob | null>(null);
  const [events, setEvents] = useState<ProgressEvent[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [surface, setSurface] = useState<SurfaceSnapshot | null>(null);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState("Idle");
  const [demoMode, setDemoMode] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const jobRef = useRef<string | null>(null);
  const demoTimers = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  // ── Single live socket for the whole app ───────────────
  useEffect(() => {
    const handle = openScanSocket(
      (evt) => applyEvent(evt),
      (s) => setConnection(s),
    );
    return () => handle.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function clearDemoTimers() {
    demoTimers.current.forEach(clearTimeout);
    demoTimers.current = [];
  }

  /** Apply one progress frame — from the live socket OR the demo simulation. */
  function applyEvent(evt: ProgressEvent) {
    // Ignore frames from a stale job when we're focused on a specific one.
    if (jobRef.current && evt.jobId && evt.jobId !== jobRef.current) return;

    setEvents((prev) => [...prev, evt]);
    if (evt.finding) setFindings((prev) => mergeFinding(prev, evt.finding!));
    if (evt.surface) setSurface((prev) => ({ ...(prev ?? DEMO_SURFACE), ...evt.surface } as SurfaceSnapshot));
    if (typeof evt.progress === "number") setProgress(evt.progress);
    if (evt.phase) setPhase(evt.phase);

    if (evt.stage === "complete" || evt.status === "complete") {
      setScan((s) => (s ? { ...s, status: "complete" } : s));
      setBusy(false);
    } else if (evt.status === "failed") {
      setScan((s) => (s ? { ...s, status: "failed" } : s));
      setBusy(false);
    }
  }

  function resetRun(job: ScanJob) {
    clearDemoTimers();
    jobRef.current = job.id;
    setScan(job);
    setEvents([]);
    setFindings([]);
    setSurface(null);
    setProgress(0);
    setPhase("Initializing");
    setStartError(null);
    setBusy(true);
  }

  /** Kick off the demo simulation for a target (backend unreachable). */
  function runDemo(input: StartScanInput) {
    const job = demoScan(input.target, input.profile);
    setDemoMode(true);
    resetRun(job);
    const steps = buildDemoRun(job.id, input.target);
    let elapsed = 0;
    for (const step of steps) {
      elapsed += step.delay;
      const t = setTimeout(() => applyEvent(step.event), elapsed);
      demoTimers.current.push(t);
    }
  }

  async function startScan(input: StartScanInput) {
    setBusy(true);
    setStartError(null);
    try {
      const job = await api.startScan(input);
      setDemoMode(false);
      resetRun({ ...job, status: job.status ?? "running" });
    } catch (err) {
      // Backend not up (or endpoint still a stub) → fall back to the demo run so
      // the dashboard is populated. Surface a non-blocking note.
      if (err instanceof ApiError || err instanceof TypeError) {
        runDemo(input);
        setStartError(
          "Backend unreachable — running the built-in demo simulation. Live data takes over as soon as the gateway responds.",
        );
        return;
      }
      setStartError(err instanceof Error ? err.message : "failed to start scan");
      setBusy(false);
    }
  }

  // ── Derived rollups ────────────────────────────────────
  const confirmedFindings = useMemo(
    () => findings.filter((f) => f.status === "confirmed"),
    [findings],
  );

  const severityCounts = useMemo(() => {
    const counts = { ...EMPTY_COUNTS };
    for (const f of findings) {
      if (f.status === "unconfirmed") continue; // dropped by verification (§9)
      counts[f.severity] += 1;
    }
    return counts;
  }, [findings]);

  const riskScore = useMemo(() => {
    // Simple weighted score (§10 severity buckets), clamped 0..100.
    const w = { critical: 25, high: 12, medium: 5, low: 1, info: 0 };
    const raw =
      severityCounts.critical * w.critical +
      severityCounts.high * w.high +
      severityCounts.medium * w.medium +
      severityCounts.low * w.low;
    return Math.min(100, raw);
  }, [severityCounts]);

  const value: StoreValue = {
    connection,
    scan,
    events,
    findings,
    surface,
    progress,
    phase,
    demoMode,
    severityCounts,
    riskScore,
    confirmedFindings,
    startScan,
    startError,
    busy,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within <StoreProvider>");
  return ctx;
}

/** Upsert a finding by id (latest wins), keeping insertion order stable. */
function mergeFinding(list: Finding[], incoming: Finding): Finding[] {
  const idx = list.findIndex((f) => f.id === incoming.id);
  if (idx === -1) return [...list, incoming];
  const next = list.slice();
  next[idx] = { ...next[idx], ...incoming };
  return next;
}
