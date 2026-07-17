import { Module } from "@nitrostack/core";
import { ReportTools } from "./report.tools.js";
import { ReportService } from "./report.service.js";
import { AttackGraphProvider } from "../../common/attack-graph.provider.js";

/** Report module (§3, §10). Privilege-free report compilation + rendering. */
@Module({
  name: "report",
  controllers: [ReportTools],
  providers: [ReportService, AttackGraphProvider],
  exports: [ReportService],
})
export class ReportModule {}
