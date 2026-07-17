import type { ScopeConfig, ScopeCheckResult } from "../schemas/scope.js";

/**
 * Central scope enforcement (§11). Every MCP server that touches a live target
 * runs a target string through here at its guard layer before the tool body.
 * out_of_scope takes precedence over in_scope.
 */
export class ScopeGuard {
  constructor(private readonly scope: ScopeConfig) {}

  /** Validate a full URL or bare host against the loaded scope. */
  check(target: string): ScopeCheckResult {
    const { host, path } = this.split(target);

    if (this.matchesAny(host, this.scope.out_of_scope.hosts)) {
      return { allowed: false, reason: `host '${host}' is explicitly out of scope` };
    }
    if (path && this.matchesAny(path, this.scope.out_of_scope.paths)) {
      return { allowed: false, reason: `path '${path}' is explicitly out of scope` };
    }
    if (!this.matchesAny(host, this.scope.in_scope.hosts)) {
      return { allowed: false, reason: `host '${host}' is not in scope` };
    }
    return { allowed: true };
  }

  /** Throwing variant for use inside guards. */
  assert(target: string): void {
    const r = this.check(target);
    if (!r.allowed) throw new ScopeViolationError(r.reason ?? "out of scope");
  }

  private split(target: string): { host: string; path: string } {
    try {
      const u = new URL(target.includes("://") ? target : `https://${target}`);
      return { host: u.hostname, path: u.pathname };
    } catch {
      return { host: target, path: "" };
    }
  }

  /** Supports exact match + leading-wildcard host patterns and glob-ish paths. */
  private matchesAny(value: string, patterns: string[]): boolean {
    return patterns.some((p) => this.matches(value, p));
  }

  private matches(value: string, pattern: string): boolean {
    // TODO: harden pattern matching (currently prefix wildcard + trailing /*).
    if (pattern === value) return true;
    if (pattern.startsWith("*.")) {
      const base = pattern.slice(2);
      return value === base || value.endsWith(`.${base}`);
    }
    if (pattern.endsWith("/*")) {
      return value.startsWith(pattern.slice(0, -1));
    }
    return false;
  }
}

export class ScopeViolationError extends Error {
  constructor(message: string) {
    super(`Scope violation: ${message}`);
    this.name = "ScopeViolationError";
  }
}
