import { Injectable, type Guard, type ExecutionContext } from "@nitrostack/core";
import { ScopeGuard } from "@zerobyte/shared";

/**
 * Scope enforcement guard (§11). Applied to every Pentester MCP tool that
 * touches a live target (Recon, Browser, Scan, Secrets modules). Rejects
 * out-of-scope targets before the tool body runs.
 *
 * Reads the tool input off the ExecutionContext and looks for a target-like
 * argument (target/url/host). Tools with no target arg pass through.
 *
 * ScopeGuard (the pure matcher from @zerobyte/shared) is DI-injected — the real
 * provider is bound in each module from the loaded scope.yaml.
 */
@Injectable()
export class ScopeCheckGuard implements Guard {
  constructor(private readonly scope: ScopeGuard) {}

  canActivate(ctx: ExecutionContext): boolean {
    const input = (ctx as unknown as { input?: Record<string, unknown> }).input ?? {};
    const target =
      (input.target as string) ??
      (input.url as string) ??
      (input.host as string);
    if (!target) return true;
    this.scope.assert(target); // throws ScopeViolationError → tool never runs
    return true;
  }
}
