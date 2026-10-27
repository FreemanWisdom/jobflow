import { describe, expect, it } from "vitest";
import { parsePlanResponse } from "@/lib/planning/plan-schema";
import { MAX_BULK_TASKS } from "@/lib/tasks/data-access";

/**
 * Unit tests for the AI-output validator. AI responses are untrusted input:
 * anything that is not an exact match for the plan schema must be rejected,
 * with no partial acceptance and no trimming surprises.
 */

function expectInvalid(raw: unknown) {
  expect(() => parsePlanResponse(raw)).toThrowError(
    expect.objectContaining({ code: "AI_INVALID_PLAN" }),
  );
}

describe("parsePlanResponse", () => {
  it("accepts a valid plan and normalizes nullish due dates", () => {
    const plan = parsePlanResponse({ tasks: [{ title: "Draft the brief", dueDate: "2026-12-15" }, { title: "Ship it", dueDate: null }, { title: "No date", dueDate: undefined }] });
    expect(plan).toEqual([
      { title: "Draft the brief", dueDate: "2026-12-15" },
      { title: "Ship it", dueDate: null },
      { title: "No date", dueDate: null },
    ]);
  });

  it("accepts the same plan delivered as a JSON string", () => {
    const plan = parsePlanResponse(JSON.stringify({ tasks: [{ title: "From a string", dueDate: "2026-11-01" }] }));
    expect(plan).toEqual([{ title: "From a string", dueDate: "2026-11-01" }]);
  });

  it("trims task titles", () => {
    const plan = parsePlanResponse({ tasks: [{ title: "  Trimmed title  ", dueDate: null }] });
    expect(plan[0].title).toBe("Trimmed title");
  });

  it("rejects content that is not JSON", () => {
    expectInvalid("certainly not json");
    expectInvalid("");
  });

  it("rejects values that are not plan objects", () => {
    expectInvalid(null);
    expectInvalid(42);
    expectInvalid("[]");
    expectInvalid({ tasks: "not-an-array" });
  });

  it("rejects plans with no tasks or too many tasks", () => {
    expectInvalid({ tasks: [] });
    expectInvalid({ tasks: Array.from({ length: MAX_BULK_TASKS + 1 }, (_, i) => ({ title: `Task ${i}`, dueDate: null })) });
  });

  it("rejects unknown fields at both levels", () => {
    expectInvalid({ tasks: [{ title: "Fine", dueDate: null }], summary: "extra" });
    expectInvalid({ tasks: [{ title: "Fine", dueDate: null, completed: true }] });
  });

  it("rejects bad titles", () => {
    expectInvalid({ tasks: [{ title: "", dueDate: null }] });
    expectInvalid({ tasks: [{ title: "   ", dueDate: null }] });
    expectInvalid({ tasks: [{ title: "x".repeat(201), dueDate: null }] });
    expectInvalid({ tasks: [{ title: 123, dueDate: null }] });
  });

  it("rejects due dates that are not strict real calendar dates", () => {
    for (const dueDate of ["2026/11/05", "05-11-2026", "2026-11-5", "2026-02-30", "2026-02-29", "2026-13-01", "2026-01-00", "next friday", "2026-11-05T00:00:00.000Z"]) {
      expectInvalid({ tasks: [{ title: "Bad date task", dueDate }] });
    }
  });

  it("accepts real leap-day dates", () => {
    const plan = parsePlanResponse({ tasks: [{ title: "Leap day task", dueDate: "2028-02-29" }] });
    expect(plan).toEqual([{ title: "Leap day task", dueDate: "2028-02-29" }]);
  });
});
