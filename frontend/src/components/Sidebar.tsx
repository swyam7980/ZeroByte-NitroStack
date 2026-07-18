import { NavLink, useNavigate } from "react-router-dom";
import { Icon } from "./Icon.js";

const NAV = [
  { to: "/", label: "Dashboard", icon: "dashboard", end: true },
  { to: "/findings", label: "Findings", icon: "security" },
  { to: "/reports", label: "Reports", icon: "description" },
  { to: "/nitrochat", label: "NitroChat", icon: "chat" },
  { to: "/settings", label: "Settings", icon: "settings" },
];

/**
 * Persistent side navigation (Sentinel design). ZeroByte brand + the four
 * sections + a primary "New Scan" CTA that routes to the initialize-scan page.
 */
export function Sidebar() {
  const navigate = useNavigate();
  return (
    <nav className="fixed h-full w-64 left-0 top-0 z-40 hidden md:flex flex-col py-stack-md px-stack-md border-r border-outline-variant bg-surface-container">
      <div className="flex items-center gap-3 mb-stack-lg px-2">
        <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center shrink-0 shadow-[0_0_18px_rgba(0,112,243,0.35)]">
          <Icon name="shield_lock" className="text-on-primary-container" fill size={22} />
        </div>
        <div>
          <h1 className="font-headline-md text-headline-md font-bold text-primary tracking-tight leading-none">
            ZeroByte
          </h1>
          <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-widest opacity-80 mt-1">
            Agentic Pentester
          </p>
        </div>
      </div>

      <button
        onClick={() => navigate("/new-scan")}
        className="w-full bg-primary-container hover:bg-inverse-primary text-on-primary-container font-label-md text-label-md py-3 rounded-lg shadow-sm flex items-center justify-center gap-2 mb-stack-lg transition-colors group active:scale-95 duration-150"
      >
        <Icon name="add_circle" size={18} className="group-hover:scale-110 transition-transform" />
        New Scan
      </button>

      <ul className="flex flex-col gap-1 flex-1">
        {NAV.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 active:scale-95 group ${
                  isActive
                    ? "text-primary font-bold border-r-2 border-primary bg-surface-variant/20"
                    : "text-on-surface-variant hover:bg-surface-variant/50 hover:text-on-surface"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon name={item.icon} fill={isActive} size={20} />
                  {item.label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-stack-md border-t border-outline-variant/40 text-[11px] font-mono-code text-on-surface-variant/60 px-1">
        MCP-first · scope-guarded
      </div>
    </nav>
  );
}
