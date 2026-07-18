import "reflect-metadata";
import { NITROSTACK_META } from "./types.js";
import type { ModuleOptions, Guard, InterceptorInterface, ExecutionContext, Constructor } from "./types.js";

// ── Simple DI container ───────────────────────────────────────────────────

class Container {
  private instances = new Map<string, unknown>();

  getOrCreate<T>(ctor: Constructor<T>): T {
    const key = ctor.name;
    if (this.instances.has(key)) return this.instances.get(key) as T;

    const paramTypes: Constructor[] =
      ((Reflect.getMetadata as ((k: string, t: unknown) => unknown[]) | undefined)
        ?.(NITROSTACK_META.PARAM_TYPES, ctor) ?? []) as Constructor[];

    const deps = paramTypes.map((dep) => this.getOrCreate(dep as Constructor));
    const instance = new ctor(...deps);
    this.instances.set(key, instance);
    return instance as T;
  }
}

// ── Module resolver ────────────────────────────────────────────────────────

interface ResolvedModule {
  controllers: Constructor[];
  providers: Constructor[];
  exports: Constructor[];
}

function resolveModule(cls: Constructor): ResolvedModule {
  const meta: ModuleOptions | undefined =
    Reflect.getOwnMetadata(NITROSTACK_META.MODULE, cls);

  if (!meta) {
    return { controllers: [], providers: [], exports: [] };
  }

  const imported = (meta.imports ?? []).flatMap((imp) => {
    const resolved = resolveModule(imp as Constructor);
    return resolved.exports;
  });

  return {
    controllers: meta.controllers ?? [],
    providers: [...imported, ...(meta.providers ?? [])],
    exports: [...(meta.exports ?? []), ...(meta.controllers ?? [])],
  };
}

// ── MCP Application Factory ───────────────────────────────────────────────

interface McpServer {
  start: () => Promise<void>;
}

export class McpApplicationFactory {
  static async create(rootModule: Constructor): Promise<McpServer> {
    const container = new Container();
    const resolved = resolveModule(rootModule);

    // Register all providers
    for (const provider of resolved.providers) {
      container.getOrCreate(provider);
    }

    // Register all controllers (tools classes)
    for (const controller of resolved.controllers) {
      container.getOrCreate(controller);
    }

    // Read McpApp metadata
    const appMeta = Reflect.getOwnMetadata(NITROSTACK_META.MCP_APP, rootModule) as
      | { server: { name: string; version: string }; logging?: { level?: string } }
      | undefined;

    const serverName = appMeta?.server?.name ?? "unknown";
    const serverVersion = appMeta?.server?.version ?? "0.0.0";

    // Collect interceptors
    const interceptors: InterceptorInterface[] = [];
    for (const provider of resolved.providers) {
      const isInterceptor = Reflect.getOwnMetadata(NITROSTACK_META.INTERCEPTOR, provider);
      if (isInterceptor) {
        const instance = container.getOrCreate(provider as Constructor);
        interceptors.push(instance as unknown as InterceptorInterface);
      }
    }

    // Build tool map (controller -> methods with tool + guard metadata)
    const toolEntries: Array<{
      name: string;
      handler: (input: unknown, ctx: ExecutionContext) => Promise<unknown>;
    }> = [];

    for (const controller of resolved.controllers) {
      const instance = container.getOrCreate(controller);
      const tools: Array<{ name: string; options: unknown; method: string }> =
        Reflect.getOwnMetadata(NITROSTACK_META.TOOL, controller) ?? [];

      for (const tool of tools) {
        const guardClasses: Constructor<Guard>[] =
          Reflect.getOwnMetadata(`${NITROSTACK_META.GUARDS}:${tool.method}`, controller) ?? [];

        const guards = guardClasses.map((g) =>
          container.getOrCreate(g as Constructor),
        ) as Guard[];

        toolEntries.push({
          name: tool.name,
          handler: async (input: unknown, ctx: ExecutionContext) => {
            // Run guards
            for (const guard of guards) {
              const allowed = await guard.canActivate(ctx);
              if (!allowed) {
                throw new Error(`Guard rejected: ${guard.constructor.name}`);
              }
            }

            // Build execution context
            const execCtx: ExecutionContext = {
              ...ctx,
              toolName: tool.name,
              input: input as Record<string, unknown>,
            };

            // Run interceptors chain
            const method = (instance as Record<string, (input: unknown, ctx: ExecutionContext) => Promise<unknown>>)[tool.method].bind(instance);

            // If no interceptors, just call the method
            if (interceptors.length === 0) {
              return method(input, execCtx);
            }

            // Build interceptor chain
            let interceptorIndex = 0;
            const run = async (): Promise<unknown> => {
              if (interceptorIndex < interceptors.length) {
                const interceptor = interceptors[interceptorIndex++];
                return interceptor.intercept(execCtx, run);
              }
              return method(input, execCtx);
            };

            return run();
          },
        });
      }
    }

    return {
      async start() {
        const toolNames = toolEntries.map((t) => t.name);
        console.log(JSON.stringify({
          event: "nitrostack_start",
          server: serverName,
          version: serverVersion,
          tools: toolNames,
          toolCount: toolNames.length,
        }));

        if (toolNames.length > 0) {
          console.log(`[${serverName}] ${toolNames.length} tool(s) registered. Ready.`);
        }
      },
    };
  }
}
