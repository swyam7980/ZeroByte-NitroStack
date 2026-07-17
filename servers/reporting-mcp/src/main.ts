import { McpApplicationFactory } from "@nitrostack/core";
import { AppModule } from "./app.module.js";

/**
 * Reporting MCP entry point. Same NitroStack factory pattern as Pentester MCP;
 * deployed as a separate NitroCloud project (`reporting-mcp`).
 */
async function bootstrap(): Promise<void> {
  const server = await McpApplicationFactory.create(AppModule);
  await server.start();
}

bootstrap();
