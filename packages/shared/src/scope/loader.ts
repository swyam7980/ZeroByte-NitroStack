import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { ScopeConfig } from "../schemas/scope.js";

/** Load + validate scope.yaml once per scan session (§11). */
export function loadScope(path: string): ScopeConfig {
  const raw = parse(readFileSync(path, "utf8"));
  return ScopeConfig.parse(raw);
}
