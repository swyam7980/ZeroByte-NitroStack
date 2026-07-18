import type { z } from "zod";

// ── Execution Context ──────────────────────────────────────────────────────

export interface ExecutionContext {
  toolName?: string;
  input?: Record<string, unknown>;
  auth?: { subject?: string };
  [key: string]: unknown;
}

// ── Guard ──────────────────────────────────────────────────────────────────

export interface Guard {
  canActivate(ctx: ExecutionContext): boolean | Promise<boolean>;
}

// ── Interceptor ────────────────────────────────────────────────────────────

export interface InterceptorInterface {
  intercept(context: ExecutionContext, next: () => Promise<unknown>): Promise<unknown>;
}

// ── Module / DI metadata types ────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Constructor<T = any> = new (...args: any[]) => T;

export interface ModuleOptions {
  name?: string;
  imports?: Constructor[];
  controllers?: Constructor[];
  providers?: Constructor[];
  exports?: Constructor[];
}

export interface McpAppOptions {
  module: Constructor;
  server: { name: string; version: string };
  logging?: { level?: string };
}

export interface ToolOptions {
  name: string;
  description: string;
  inputSchema: z.ZodTypeAny;
}

// ── Metadata store keys ───────────────────────────────────────────────────

export const NITROSTACK_META = {
  MODULE: "__nitrostack_module__",
  MCP_APP: "__nitrostack_mcp_app__",
  INJECTABLE: "__nitrostack_injectable__",
  TOOL: "__nitrostack_tool__",
  GUARDS: "__nitrostack_guards__",
  INTERCEPTOR: "__nitrostack_interceptor__",
  PARAM_TYPES: "design:paramtypes",
} as const;
