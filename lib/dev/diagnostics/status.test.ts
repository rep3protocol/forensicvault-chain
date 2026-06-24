import { describe, expect, it } from "vitest";
import {
  computeOverallDiagnosticStatus,
  summarizeDiagnosticRun,
} from "@/lib/dev/diagnostics/status";
import type { DiagnosticCheck } from "@/lib/dev/diagnostics/types";

function check(status: DiagnosticCheck["status"], id = "c1"): DiagnosticCheck {
  return {
    id,
    category: "SYSTEM",
    name: "Test check",
    status,
    summary: "summary",
    durationMs: 1,
  };
}

describe("diagnostic status", () => {
  it("returns GO when all checks pass", () => {
    expect(
      computeOverallDiagnosticStatus([check("GO"), check("GO", "c2")]),
    ).toBe("GO");
  });

  it("returns WARNING when warnings exist without NO_GO", () => {
    expect(
      computeOverallDiagnosticStatus([check("GO"), check("WARNING", "c2")]),
    ).toBe("WARNING");
  });

  it("returns NO_GO when any check fails", () => {
    expect(
      computeOverallDiagnosticStatus([check("GO"), check("NO_GO", "c2")]),
    ).toBe("NO_GO");
  });

  it("summarizes counts correctly", () => {
    const run = summarizeDiagnosticRun(
      "run-1",
      new Date("2026-06-23T12:00:00.000Z"),
      new Date("2026-06-23T12:00:01.000Z"),
      [check("GO"), check("WARNING", "c2"), check("SKIPPED", "c3")],
      "readOnly",
    );

    expect(run.goCount).toBe(1);
    expect(run.warningCount).toBe(1);
    expect(run.skippedCount).toBe(1);
    expect(run.noGoCount).toBe(0);
    expect(run.overallStatus).toBe("WARNING");
    expect(run.durationMs).toBe(1000);
  });
});
