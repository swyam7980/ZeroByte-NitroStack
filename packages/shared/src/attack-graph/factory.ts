import type { AttackGraphClient } from "./client.js";
import { HttpAttackGraphClient } from "./http-client.js";
import { InMemoryAttackGraphClient } from "./in-memory-client.js";

/**
 * Build the AttackGraphClient an MCP server should use (§6).
 *
 * - If `ATTACK_GRAPH_URL` is set → HTTP client against the backend-owned store
 *   (the real deployed topology: two processes sharing one store).
 * - Otherwise → in-process store, so a single server can run standalone under
 *   NitroStudio with no backend. Reporting reads only `confirmed`; in standalone
 *   mode it simply sees an empty confirmed set unless the same process wrote them.
 */
export function createAttackGraphClient(env: NodeJS.ProcessEnv = process.env): AttackGraphClient {
  const scanSessionId = env.SCAN_SESSION_ID ?? "local-session";
  const baseUrl = env.ATTACK_GRAPH_URL;
  if (baseUrl) {
    return new HttpAttackGraphClient(baseUrl, scanSessionId, env.ATTACK_GRAPH_TOKEN);
  }
  return new InMemoryAttackGraphClient(scanSessionId);
}
