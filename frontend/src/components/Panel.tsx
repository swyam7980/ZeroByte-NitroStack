import type { ReactNode } from "react";
import { Icon } from "./Icon.js";

/**
 * Standard dashboard card (§ design: 1px outline, 12px radius, ≥24px padding).
 * `aiGlow` adds the blue→purple gradient border reserved for AI-driven surfaces.
 */
export function Panel({
  title,
  icon,
  action,
  children,
  className = "",
  bodyClassName = "",
  aiGlow = false,
  noPad = false,
}: {
  title?: string;
  icon?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  aiGlow?: boolean;
  noPad?: boolean;
}) {
  return (
    <section
      className={`bg-surface-container border border-outline-variant rounded-xl overflow-hidden ${
        aiGlow ? "ai-border-glow" : ""
      } ${className}`}
    >
      {title && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
          <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
            {icon && <Icon name={icon} className="text-primary-container" />}
            {title}
          </h3>
          {action}
        </div>
      )}
      <div className={noPad ? "" : `p-5 ${bodyClassName}`}>{children}</div>
    </section>
  );
}
