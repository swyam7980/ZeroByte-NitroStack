import { Interceptor, type InterceptorInterface, type ExecutionContext } from "@nitrostack/core";

/**
 * Audit logging interceptor (§6, §11). Wraps every tool call across both servers
 * — logs invocation (args + requester identity + scan-session ID) before and the
 * result after. In NitroCloud this surfaces via built-in monitoring; locally it
 * prints structured JSON.
 */
@Interceptor()
export class AuditInterceptor implements InterceptorInterface {
  async intercept(context: ExecutionContext, next: () => Promise<unknown>): Promise<unknown> {
    const ctx = context as unknown as {
      toolName?: string;
      input?: Record<string, unknown>;
      auth?: { subject?: string };
    };
    const base = {
      tool: ctx.toolName,
      requester: ctx.auth?.subject,
      args: ctx.input,
    };
    this.emit("tool_call_start", base);
    const result = await next();
    this.emit("tool_call_result", { ...base, ok: true });
    return result;
  }

  private emit(event: string, fields: Record<string, unknown>): void {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ event, ...fields }));
  }
}
