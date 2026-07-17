import { Injectable } from "@nitrostack/core";
import type { AttackGraphClient } from "@zerobyte/shared";

/**
 * Read-only Attack Graph client for Reporting MCP (§2.2). Reads ONLY confirmed
 * findings — the report-rendering path literally cannot reach a live target.
 */
@Injectable()
export class AttackGraphProvider {
  // TODO: construct the real HTTP-backed AttackGraphClient (read-only creds).
  get client(): AttackGraphClient {
    throw new Error("AttackGraphClient not wired — inject backend store URL");
  }
}
