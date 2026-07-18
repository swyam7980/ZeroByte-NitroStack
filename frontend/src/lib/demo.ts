import type {
  Finding,
  ProgressEvent,
  ScanJob,
  SurfaceSnapshot,
  AgentLogKind,
} from "../types.js";

/**
 * Demo simulation (§5, §13 MVP). When no backend is reachable, the store falls
 * back to this so the dashboard is fully populated for a hackathon walk-through.
 * It mirrors the exact shapes the real backend streams — the four-agent pipeline
 * (recon → scan → secrets → verify → report), candidates that get independently
 * verified, and a handful being dropped as false positives (§9).
 *
 * This is purely a frontend convenience. The moment the real WS gateway sends a
 * frame, live data takes over.
 */

export const DEMO_STACK = ["React 18.2", "Nginx 1.18.0", "Express.js", "MongoDB", "AWS CloudFront"];

export const DEMO_SURFACE: SurfaceSnapshot = {
  openPorts: [80, 443, 8080, 22],
  subdomains: 12,
  wafDetected: "Cloudflare",
  detectedStack: DEMO_STACK,
};

/** Candidate findings a scan surfaces, in discovery order. */
const DEMO_FINDINGS: Array<Omit<Finding, "status" | "confidence"> & { reproduces: boolean }> = [
  {
    id: "f-001",
    type: "SQL Injection (Blind)",
    asset: "/api/v1/auth/login",
    severity: "critical",
    description: "Error-based SQL injection in the login endpoint's id parameter (POST).",
    discoveredBy: "sqlmap",
    reproduces: true,
  },
  {
    id: "f-002",
    type: "Exposed .git Directory",
    asset: "target.com/.git/HEAD",
    severity: "critical",
    description: "Source disclosure — .git directory is browsable and leaks refs/objects.",
    discoveredBy: "nuclei",
    reproduces: true,
  },
  {
    id: "f-003",
    type: "Stored XSS",
    asset: "/profile/settings (Bio)",
    severity: "high",
    description: "Stored cross-site scripting via the profile Bio field, rendered unescaped.",
    discoveredBy: "nuclei",
    reproduces: true,
  },
  {
    id: "f-004",
    type: "Exposed AWS Key",
    asset: "assets/app.js",
    severity: "high",
    description: "AWS access key id exposed in a bundled JS asset (value redacted).",
    discoveredBy: "gitleaks",
    reproduces: true,
  },
  {
    id: "f-005",
    type: "Log4Shell (CVE-2021-44228)",
    asset: "target.com",
    severity: "critical",
    description: "Candidate JNDI injection via crafted header — flagged by nuclei template.",
    discoveredBy: "nuclei",
    reproduces: false, // dropped on independent replay (§9)
  },
  {
    id: "f-006",
    type: "IDOR",
    asset: "/api/v1/invoice/{id}",
    severity: "medium",
    description: "Insecure direct object reference exposes other tenants' invoices.",
    discoveredBy: "nuclei",
    reproduces: true,
  },
  {
    id: "f-007",
    type: "Missing Security Headers",
    asset: "Global Response",
    severity: "medium",
    description: "No Content-Security-Policy / HSTS / X-Frame-Options on primary domain.",
    discoveredBy: "nuclei",
    reproduces: true,
  },
  {
    id: "f-008",
    type: "Open Redirect",
    asset: "/redirect?url=",
    severity: "low",
    description: "Reflected open redirect — did not reproduce in a clean context.",
    discoveredBy: "nuclei",
    reproduces: false,
  },
  {
    id: "f-009",
    type: "Server Version Disclosure",
    asset: "HTTP Header (Server)",
    severity: "low",
    description: "Server header leaks Nginx/1.18.0 — information disclosure.",
    discoveredBy: "nuclei",
    reproduces: true,
  },
];

interface Step {
  delay: number; // ms after previous step
  event: ProgressEvent;
}

function log(
  jobId: string,
  stage: ProgressEvent["stage"],
  kind: AgentLogKind,
  message: string,
  extra: Partial<ProgressEvent> = {},
): ProgressEvent {
  return { jobId, stage, kind, message, ...extra };
}

/**
 * Build the ordered event stream for a simulated scan of `target`. Returns steps
 * with inter-step delays; the store schedules them.
 */
export function buildDemoRun(jobId: string, target: string): Step[] {
  const steps: Step[] = [];
  const push = (delay: number, event: ProgressEvent) => steps.push({ delay, event });

  // ── Recon (§2.1) ──────────────────────────────────
  push(300, log(jobId, "recon", "INFO", `Resolving ${target}…`, { phase: "Recon", progress: 4 }));
  push(500, log(jobId, "recon", "CRAWL", "Enumerating subdomains via passive sources…", { progress: 10 }));
  push(500, log(jobId, "recon", "SCAN", "Fingerprinting stack: Nginx, Express, MongoDB detected", { progress: 16, surface: DEMO_SURFACE }));
  push(500, log(jobId, "recon", "CRAWL", "Discovered hidden endpoint: /api/v1/users/admin/export", { phase: "Deep Crawl", progress: 24 }));
  push(400, log(jobId, "recon", "INFO", "12 subdomains mapped, 5 endpoints crawled", { progress: 30 }));

  // ── Scan + Secrets → candidates (§2.3, §2.4) ──────
  push(600, log(jobId, "scan", "FUZZ", "Testing XSS payloads on parameter 'q' at /search", { phase: "Active Scan", progress: 38 }));
  const candidates = DEMO_FINDINGS;
  candidates.forEach((c, i) => {
    const stage = c.discoveredBy === "gitleaks" ? "secrets" : "scan";
    const kind: AgentLogKind = c.severity === "critical" || c.severity === "high" ? "ALERT" : "SCAN";
    push(
      450,
      log(jobId, stage, kind, `Candidate: ${c.type} @ ${c.asset}`, {
        progress: 40 + Math.round((i / candidates.length) * 25),
        finding: { ...c, status: "candidate", confidence: 0 },
      }),
    );
  });

  // ── Verification — fresh context per candidate (§9) ──
  push(600, log(jobId, "verify", "VERIFY", "Dispatching candidates to Verification agent (fresh context each)…", { phase: "Verification", progress: 68 }));
  candidates.forEach((c, i) => {
    push(
      250,
      log(jobId, "verify", "VERIFY", `Verifying ${c.type}…`, {
        progress: 70 + Math.round((i / candidates.length) * 22),
        finding: { ...c, status: "verifying", confidence: 0 },
      }),
    );
    const confidence = c.reproduces ? 0.72 + Math.random() * 0.25 : 0.12 + Math.random() * 0.15;
    push(
      300,
      log(
        jobId,
        "verify",
        c.reproduces ? "VERIFY" : "INFO",
        c.reproduces
          ? `Confirmed ${c.type} (${Math.round(confidence * 100)}%)`
          : `Dropped ${c.type} — did not reproduce independently`,
        {
          finding: {
            ...c,
            status: c.reproduces ? "confirmed" : "unconfirmed",
            confidence,
            verifiedAt: "just now",
            verificationTranscript: c.reproduces
              ? `fresh-context replay reproduced expected signal for ${c.asset}`
              : `independent replay did not observe the expected signal for ${c.asset}`,
          },
        },
      ),
    );
  });

  // ── Report — confirmed only (§10) ─────────────────
  push(600, log(jobId, "report", "REPORT", "Compiling executive report from confirmed findings…", { phase: "Reporting", progress: 96 }));
  push(700, log(jobId, "complete", "REPORT", "Scan complete — report ready.", { phase: "Complete", progress: 100, status: "complete" }));

  return steps;
}

export function demoScan(target: string, profile: ScanJob["profile"] = "standard_audit"): ScanJob {
  return {
    id: `demo-${Math.random().toString(36).slice(2, 8)}`,
    target,
    profile,
    status: "running",
    createdAt: new Date().toISOString(),
  };
}

/** Recent-executions list shown on the New Scan page (§ sidebar). */
export const DEMO_RECENT: Array<{
  target: string;
  profile: string;
  status: string;
  tone: "running" | "critical" | "clean" | "warning";
  when: string;
}> = [
  { target: "api.staging.internal", profile: "Deep Injection", status: "Running", tone: "running", when: "Started 2m ago" },
  { target: "10.0.4.0/24", profile: "Standard Audit", status: "3 Critical", tone: "critical", when: "Today, 08:42" },
  { target: "auth-gateway.aws.cloud", profile: "Quick Recon", status: "Clean", tone: "clean", when: "Yesterday" },
  { target: "legacy-db.internal", profile: "Custom Profile", status: "Warning", tone: "warning", when: "Oct 24" },
];
