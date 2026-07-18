import { AttackGraphStore } from "@zerobyte/shared";

/**
 * Session-scoped attack-graph registry. The MCP server HTTP endpoints and the
 * backend queue can resolve the same per-scan store via `x-scan-session`.
 */
export class AttackGraphRegistry {
  private readonly stores = new Map<string, AttackGraphStore>();

  forSession(scanSessionId: string): AttackGraphStore {
    let store = this.stores.get(scanSessionId);
    if (!store) {
      store = new AttackGraphStore();
      this.stores.set(scanSessionId, store);
    }
    return store;
  }

  snapshot(scanSessionId: string) {
    return this.forSession(scanSessionId).snapshot();
  }
}
