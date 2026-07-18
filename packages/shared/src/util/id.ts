import { randomUUID } from "node:crypto";

/** Short, prefixed, collision-resistant id for graph nodes and artifacts. */
export function newId(prefix: string): string {
  return `${prefix}_${randomUUID().slice(0, 8)}`;
}

/** ISO timestamp helper — one place so every server stamps consistently. */
export function nowIso(): string {
  return new Date().toISOString();
}
