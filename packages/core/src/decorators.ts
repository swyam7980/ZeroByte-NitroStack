import "reflect-metadata";
import type {
  ModuleOptions,
  McpAppOptions,
  ToolOptions,
  Guard,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Constructor,
} from "./types.js";
import { NITROSTACK_META } from "./types.js";

/**
 * @Injectable() — class decorator. Marks a class as available for DI.
 */
export function Injectable(): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(NITROSTACK_META.INJECTABLE, true, target);
  };
}

/**
 * @Module({...}) — class decorator. Registers module metadata (imports,
 * controllers, providers, exports).
 */
export function Module(options: ModuleOptions): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(NITROSTACK_META.MODULE, options, target);
  };
}

/**
 * @McpApp({...}) — class decorator. Marks the root application module and
 * stores server identity + logging config.
 */
export function McpApp(options: McpAppOptions): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(NITROSTACK_META.MCP_APP, options, target);
  };
}

/**
 * @Tool({...}) — method decorator. Registers an MCP tool with its name,
 * description, and Zod input schema.
 */
export function Tool(options: ToolOptions): MethodDecorator {
  return (target, propertyKey) => {
    const existing: Array<{ name: string; options: ToolOptions; method: string }> =
      Reflect.getOwnMetadata(NITROSTACK_META.TOOL, target.constructor) ?? [];
    existing.push({ name: options.name, options, method: String(propertyKey) });
    Reflect.defineMetadata(NITROSTACK_META.TOOL, existing, target.constructor);
  };
}

/**
 * @UseGuards(...) — method decorator. Attaches guard classes to a tool method.
 */
export function UseGuards(...guards: Array<Constructor<Guard>>): MethodDecorator {
  return (target, propertyKey) => {
    const metaKey = `${NITROSTACK_META.GUARDS}:${String(propertyKey)}`;
    Reflect.defineMetadata(metaKey, guards, target.constructor);
  };
}

/**
 * @Interceptor() — class decorator. Marks a class as a global interceptor.
 */
export function Interceptor(): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(NITROSTACK_META.INTERCEPTOR, true, target);
  };
}
