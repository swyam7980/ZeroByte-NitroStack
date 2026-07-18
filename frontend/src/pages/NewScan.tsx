import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../lib/store.js";
import { Icon } from "../components/Icon.js";
import { DEMO_RECENT } from "../lib/demo.js";
import type { ScanProfile } from "../types.js";

interface ProfileDef {
  key: ScanProfile;
  icon: string;
  title: string;
  desc: string;
  /** Which Pentester MCP modules this profile engages (§2.1). */
  modules: string;
}

const PROFILES: ProfileDef[] = [
  {
    key: "quick_recon",
    icon: "bolt",
    title: "Quick Recon",
    desc: "Passive enumeration + fingerprint. Recon module only, light-active. (~2 mins)",
    modules: "recon",
  },
  {
    key: "standard_audit",
    icon: "fact_check",
    title: "Standard Audit",
    desc: "Recon + nuclei scan + secrets, each candidate independently verified. (~15 mins)",
    modules: "recon · scan · secrets · verify",
  },
  {
    key: "deep_injection",
    icon: "troubleshoot",
    title: "Deep Injection",
    desc: "Adds sqlmap + browser user-flow automation. High noise, scope-guarded. (~1+ hrs)",
    modules: "recon · browser · scan · secrets · verify",
  },
  {
    key: "custom",
    icon: "tune",
    title: "Custom Profile",
    desc: "Select specific scope-guarded modules.",
    modules: "pick modules",
  },
];

const RECENT_TONE: Record<string, string> = {
  running: "bg-primary/10 text-primary border-primary/30",
  critical: "bg-error/10 text-error border-error/30",
  clean: "bg-secondary/10 text-secondary border-secondary/30",
  warning: "bg-tertiary/10 text-tertiary border-tertiary/30",
};

export function NewScan() {
  const navigate = useNavigate();
  const { startScan, busy, startError } = useStore();

  const [target, setTarget] = useState("");
  const [profile, setProfile] = useState<ScanProfile>("standard_audit");
  const [bearer, setBearer] = useState("");
  const [cookie, setCookie] = useState("");

  async function engage() {
    const t = target.trim();
    if (!t || busy) return;
    await startScan({
      target: t,
      profile,
      auth: bearer || cookie ? { bearer: bearer || undefined, cookie: cookie || undefined } : undefined,
    });
    navigate("/");
  }

  return (
    <>
      <div className="mb-2">
        <h2 className="font-headline-xl text-headline-xl text-on-surface tracking-tight mb-2">Initialize Scan</h2>
        <p className="text-on-surface-variant font-body-lg text-body-lg max-w-2xl">
          Configure target parameters and analysis depth. Every target is validated against{" "}
          <code className="font-mono-code text-primary">scope.yaml</code> before any tool touches it.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-gutter">
        {/* Main config */}
        <div className="xl:col-span-8 flex flex-col gap-stack-lg">
          {/* Target */}
          <section className="bg-surface-container border border-outline-variant rounded-lg p-stack-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-container/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
            <label className="font-headline-md text-headline-md text-on-surface mb-stack-sm flex items-center gap-2" htmlFor="target">
              <Icon name="radar" className="text-primary-container" />
              Target Specification
            </label>
            <p className="text-on-surface-variant font-body-md text-body-md mb-stack-md">
              Enter the in-scope URL, host, or IP to be analyzed.
            </p>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">
                language
              </span>
              <input
                id="target"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && engage()}
                spellCheck={false}
                autoComplete="off"
                className="w-full bg-surface-dim border border-outline-variant rounded-md py-4 pl-12 pr-4 font-mono-code text-[15px] text-on-surface placeholder:text-outline focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all"
                placeholder="e.g., https://api.example.com or example.com"
                type="text"
              />
            </div>
          </section>

          {/* Analysis depth */}
          <section>
            <h3 className="font-headline-md text-headline-md text-on-surface mb-stack-md">Analysis Depth</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-md">
              {PROFILES.map((p) => {
                const selected = profile === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setProfile(p.key)}
                    className={`text-left rounded-lg p-stack-md relative transition-all duration-200 ${
                      selected
                        ? "bg-surface-container-low border border-primary-container ai-border-glow shadow-[0_0_15px_rgba(0,112,243,0.1)]"
                        : "bg-surface border border-outline-variant hover:bg-surface-container-highest"
                    } ${p.key === "custom" ? "border-dashed" : ""}`}
                  >
                    {selected && (
                      <span className="absolute top-4 right-4 text-primary-container">
                        <Icon name="check_circle" fill />
                      </span>
                    )}
                    <Icon
                      name={p.icon}
                      size={32}
                      className={`mb-3 block ${selected ? "text-primary-container" : "text-secondary"}`}
                    />
                    <h4 className="font-label-md text-label-md text-on-surface uppercase tracking-wider mb-1">
                      {p.title}
                    </h4>
                    <p className="text-on-surface-variant text-[13px] leading-relaxed mb-2">{p.desc}</p>
                    <p className="font-mono-code text-[11px] text-primary-container/80">{p.modules}</p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Auth context */}
          <details className="group bg-surface border border-outline-variant rounded-lg overflow-hidden [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex items-center justify-between p-stack-md cursor-pointer hover:bg-surface-container-highest transition-colors">
              <div className="flex items-center gap-3">
                <Icon name="vpn_key" className="text-secondary" />
                <span className="font-label-md text-label-md text-on-surface uppercase tracking-wider">
                  Authentication Context
                </span>
              </div>
              <Icon name="expand_more" className="text-outline group-open:rotate-180 transition-transform" />
            </summary>
            <div className="p-stack-md border-t border-outline-variant bg-surface-dim grid grid-cols-1 md:grid-cols-2 gap-stack-md">
              <AuthInput label="Auth Header (Bearer Token)" value={bearer} onChange={setBearer} placeholder="eyJh…" />
              <AuthInput label="Cookie String" value={cookie} onChange={setCookie} placeholder="session_id=…" />
            </div>
          </details>

          {/* Footer actions */}
          <div className="pt-stack-md flex items-center justify-end gap-4 border-t border-outline-variant">
            <button
              onClick={() => navigate("/")}
              className="text-on-surface-variant hover:text-on-surface font-label-md text-label-md px-6 py-3 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={engage}
              disabled={!target.trim() || busy}
              className="bg-primary-container hover:bg-inverse-primary disabled:opacity-50 disabled:cursor-not-allowed text-on-primary-container font-label-md text-label-md uppercase tracking-wider px-8 py-3 rounded-lg shadow-[0_4px_14px_0_rgba(0,112,243,0.39)] hover:-translate-y-0.5 transition-all flex items-center gap-2"
            >
              <Icon name="play_arrow" size={18} />
              {busy ? "Engaging…" : "Engage Scan"}
            </button>
          </div>

          {startError && (
            <p className="text-tertiary text-[13px] font-mono-code -mt-2 flex items-center gap-2">
              <Icon name="info" size={16} />
              {startError}
            </p>
          )}
        </div>

        {/* Recent executions */}
        <aside className="xl:col-span-4 hidden xl:flex flex-col border-l border-outline-variant pl-gutter">
          <div className="flex items-center justify-between mb-stack-md">
            <h3 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-widest">
              Recent Executions
            </h3>
            <button className="text-primary text-[12px] hover:underline font-mono-code">View Logs</button>
          </div>
          <div className="flex flex-col gap-2">
            {DEMO_RECENT.map((r) => (
              <div
                key={r.target}
                className="bg-surface-container-low border border-outline-variant rounded-md p-3 flex flex-col gap-1.5 hover:border-outline transition-colors cursor-default"
              >
                <div className="flex justify-between items-center">
                  <span className="font-mono-code text-[13px] text-on-surface truncate pr-2">{r.target}</span>
                  <span
                    className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${RECENT_TONE[r.tone]}`}
                  >
                    {r.status}
                  </span>
                </div>
                <div className="flex justify-between items-center text-on-surface-variant text-[11px] font-mono-code">
                  <span>{r.profile}</span>
                  <span>{r.when}</span>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </>
  );
}

function AuthInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="block font-mono-code text-[11px] text-on-surface-variant uppercase tracking-widest mb-2">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        className="w-full bg-background border border-outline-variant rounded px-3 py-2 font-mono-code text-[13px] text-on-surface focus:border-primary-container focus:outline-none"
        type="text"
      />
    </div>
  );
}
