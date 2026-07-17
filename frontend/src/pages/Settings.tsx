import { useState } from "react";
import { Icon } from "../components/Icon.js";

const SECTIONS = ["Scan Defaults", "Scope", "MCP Endpoints", "API Keys"] as const;
type Section = (typeof SECTIONS)[number];

const SCOPE_YAML = `in_scope:
  hosts:
    - "example.com"
    - "*.example.com"
  paths: ["/", "/api/*"]
out_of_scope:
  hosts: ["payments.example.com"]
limits:
  max_requests_per_second: 10
allowed_tools:
  nuclei: { profiles: [default, cves, misconfiguration] }
  gitleaks: { enabled: true }`;

export function Settings() {
  const [section, setSection] = useState<Section>("Scan Defaults");

  return (
    <>
      <div>
        <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface mb-1">System Configuration</h2>
        <p className="text-on-surface-variant font-body-md text-body-md max-w-2xl">
          Manage scope, MCP endpoints, and scan defaults. Scope changes take effect on the next scan session.
        </p>
      </div>

      <div className="grid grid-cols-12 gap-gutter">
        {/* Section nav */}
        <aside className="col-span-12 md:col-span-3">
          <ul className="flex md:flex-col gap-1 border-l border-outline-variant">
            {SECTIONS.map((s) => (
              <li key={s}>
                <button
                  onClick={() => setSection(s)}
                  className={`w-full text-left px-4 py-2 -ml-px border-l-2 transition-colors ${
                    section === s
                      ? "border-primary text-primary font-medium"
                      : "border-transparent text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* Section body */}
        <div className="col-span-12 md:col-span-9 space-y-stack-lg">
          {section === "Scan Defaults" && <ScanDefaults />}
          {section === "Scope" && <ScopeConfig />}
          {section === "MCP Endpoints" && <McpEndpoints />}
          {section === "API Keys" && <ApiKeys />}
        </div>
      </div>
    </>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-surface-container border border-outline-variant rounded-xl p-gutter">
      <h3 className="font-headline-md text-headline-md text-on-surface mb-stack-md">{title}</h3>
      {children}
    </section>
  );
}

function ScanDefaults() {
  const [autoMap, setAutoMap] = useState(true);
  return (
    <Card title="Scan Defaults">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-stack-md mb-stack-md">
        <Labeled label="Default Intensity">
          <select className="w-full bg-surface-dim border border-outline-variant rounded px-3 py-2.5 text-on-surface focus:border-primary-container focus:outline-none">
            <option>Standard Audit (Balanced)</option>
            <option>Quick Recon</option>
            <option>Deep Injection</option>
          </select>
        </Labeled>
        <Labeled label="Max Concurrent Sessions">
          <input
            defaultValue={3}
            type="number"
            className="w-full bg-surface-dim border border-outline-variant rounded px-3 py-2.5 font-mono-code text-on-surface focus:border-primary-container focus:outline-none"
          />
        </Labeled>
      </div>
      <button
        onClick={() => setAutoMap((v) => !v)}
        className="flex items-center gap-3 mb-stack-md"
        type="button"
      >
        <span
          className={`w-11 h-6 rounded-full p-0.5 transition-colors ${autoMap ? "bg-primary-container" : "bg-surface-variant"}`}
        >
          <span
            className={`block w-5 h-5 rounded-full bg-white transition-transform ${autoMap ? "translate-x-5" : ""}`}
          />
        </span>
        <span className="text-on-surface">Automatically map subdomains before active scan</span>
      </button>
      <div className="flex justify-end">
        <SaveButton />
      </div>
    </Card>
  );
}

function ScopeConfig() {
  return (
    <Card title="scope.yaml — Single Source of Truth (§11)">
      <p className="text-on-surface-variant text-[13px] mb-stack-md">
        Every Pentester MCP module validates targets against this before touching anything live. Out-of-scope
        entries take precedence over in-scope.
      </p>
      <textarea
        defaultValue={SCOPE_YAML}
        spellCheck={false}
        rows={14}
        className="w-full bg-surface-dim border border-outline-variant rounded px-4 py-3 font-mono-code text-[13px] text-on-surface focus:border-primary-container focus:outline-none resize-none leading-relaxed"
      />
      <div className="flex justify-end mt-stack-md">
        <SaveButton label="Save Scope" />
      </div>
    </Card>
  );
}

function McpEndpoints() {
  return (
    <Card title="MCP Endpoints">
      <p className="text-on-surface-variant text-[13px] mb-stack-md">
        The backend connects to two NitroCloud-hosted MCP servers as a client (§6). Populated after deploy.
      </p>
      <div className="space-y-stack-md">
        <Labeled label="Pentester MCP (recon · browser · scan · secrets · verify)">
          <EndpointInput defaultValue="http://localhost:5101" />
        </Labeled>
        <Labeled label="Reporting MCP (compile · export)">
          <EndpointInput defaultValue="http://localhost:5102" />
        </Labeled>
        <Labeled label="NitroStack Gateway">
          <EndpointInput defaultValue="https://gateway.nitrocloud.local" />
        </Labeled>
      </div>
      <div className="flex justify-end mt-stack-md">
        <SaveButton label="Save Endpoints" />
      </div>
    </Card>
  );
}

function ApiKeys() {
  const keys = [
    { name: "Production CI/CD", preview: "sk_live_…a8f9", created: "Oct 12, 2025" },
    { name: "Local Dev", preview: "sk_test_…2b1c", created: "Nov 04, 2025" },
  ];
  return (
    <Card title="API Keys">
      <div className="flex justify-between items-center mb-stack-md">
        <p className="text-on-surface-variant text-[13px]">Keys authenticate the backend to the NitroStack Gateway.</p>
        <button className="bg-primary-container text-on-primary-container px-3 py-1.5 rounded text-[13px] font-medium hover:bg-inverse-primary transition-colors flex items-center gap-1.5">
          <Icon name="add" size={16} />
          Generate Key
        </button>
      </div>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-outline-variant text-on-surface-variant font-label-md text-label-md uppercase tracking-wider">
            <th className="py-3 font-medium">Name</th>
            <th className="py-3 font-medium">Preview</th>
            <th className="py-3 font-medium">Created</th>
            <th className="py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {keys.map((k) => (
            <tr key={k.name}>
              <td className="py-3 text-on-surface">{k.name}</td>
              <td className="py-3 font-mono-code text-on-surface-variant">{k.preview}</td>
              <td className="py-3 text-on-surface-variant">{k.created}</td>
              <td className="py-3 text-right">
                <button className="text-on-surface-variant hover:text-error transition-colors">
                  <Icon name="delete" size={18} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block font-label-md text-label-md text-on-surface-variant mb-2">{label}</label>
      {children}
    </div>
  );
}

function EndpointInput({ defaultValue }: { defaultValue: string }) {
  return (
    <input
      defaultValue={defaultValue}
      spellCheck={false}
      className="w-full bg-surface-dim border border-outline-variant rounded px-3 py-2.5 font-mono-code text-[13px] text-on-surface focus:border-primary-container focus:outline-none"
    />
  );
}

function SaveButton({ label = "Save Defaults" }: { label?: string }) {
  return (
    <button className="bg-surface-container-high border border-outline-variant text-on-surface hover:border-primary-container hover:text-primary transition-colors px-4 py-2 rounded text-body-md">
      {label}
    </button>
  );
}
