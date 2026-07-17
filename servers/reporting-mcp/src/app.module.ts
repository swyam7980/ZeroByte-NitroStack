import { McpApp, Module } from "@nitrostack/core";
import { ReportModule } from "./modules/report/report.module.js";

/**
 * Reporting MCP root (§2.2). Deliberately privilege-free — none of the Docker/
 * network/browser capabilities of the Pentester server. The "just transforms
 * confirmed data" half of the system.
 */
@McpApp({
  module: AppModule,
  server: { name: "reporting-mcp", version: "0.1.0" },
  logging: { level: "info" },
})
@Module({
  imports: [ReportModule],
})
export class AppModule {}
