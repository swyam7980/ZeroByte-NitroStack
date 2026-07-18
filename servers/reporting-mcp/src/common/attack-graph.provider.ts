import { Injectable } from "@nitrostack/core";
import { createAttackGraphClient, type AttackGraphClient } from "@zerobyte/shared";

/**
 * Read-focused Attack Graph client for Reporting MCP (§2.2). Reads only confirmed
 * findings — the report-rendering path holds no Docker/network/browser privilege
 * and literally cannot reach a live target.
 *
 * Deployed: HTTP client to the backend store (set ATTACK_GRAPH_URL). Standalone:
 * in-process store (will only see findings written by this same process).
 */
@Injectable()
export class AttackGraphProvider {
  readonly client: AttackGraphClient;

  constructor() {
    this.client = createAttackGraphClient();
  }
}
