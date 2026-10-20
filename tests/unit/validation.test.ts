import { describe, expect, it } from "vitest";
import { createJobSchema, updateJobSchema } from "@/lib/jobs/validation";
import { JobPriority, JobStatus } from "@prisma/client";

describe("createJobSchema", () => {
  it("accepts a minimal valid job and applies defaults", () => {
    const result = createJobSchema.parse({ title: "  New site  " });
    expect(result.title).toBe("New site");
    expect(result.status).toBe(JobStatus.PLANNING);
    expect(result.priority).toBe(JobPriority.MEDIUM);
    // Progress is intentionally not defaulted here: the data layer derives it.
    expect(result.progress).toBeUndefined();
    expect(result.deadline).toBeNull();
    expect(result.budget).toBeNull();
  });

  it("normalizes budgets with currency symbols and grouping", () => {
    const result = createJobSchema.parse({ title: "Job", budget: "$1,234.50" });
    expect(result.budget).toBe("1234.50");
  });

  it("rejects invalid budgets", () => {
    expect(() => createJobSchema.parse({ title: "Job", budget: "twelve" })).toThrow();
    expect(() => createJobSchema.parse({ title: "Job", budget: "-5" })).toThrow();
    expect(() => createJobSchema.parse({ title: "Job", budget: "1.234" })).toThrow();
  });

  it("rejects empty and oversized titles", () => {
    expect(() => createJobSchema.parse({ title: "   " })).toThrow();
    expect(() => createJobSchema.parse({ title: "x".repeat(101) })).toThrow();
  });

  it("parses YYYY-MM-DD deadlines into UTC dates and accepts null", () => {
    const result = createJobSchema.parse({ title: "Job", deadline: "2026-09-01" });
    expect(result.deadline?.toISOString()).toBe("2026-09-01T00:00:00.000Z");
    expect(createJobSchema.parse({ title: "Job", deadline: null }).deadline).toBeNull();
  });

  it("rejects malformed deadlines and bad enum values", () => {
    expect(() => createJobSchema.parse({ title: "Job", deadline: "09/01/2026" })).toThrow();
    expect(() => createJobSchema.parse({ title: "Job", status: "WIP" })).toThrow();
  });

  it("rejects progress outside 0-100 and non-integer progress", () => {
    expect(() => createJobSchema.parse({ title: "Job", progress: 101 })).toThrow();
    expect(() => createJobSchema.parse({ title: "Job", progress: -1 })).toThrow();
    expect(() => createJobSchema.parse({ title: "Job", progress: 12.5 })).toThrow();
  });

  it("rejects unknown extra keys (strict)", () => {
    expect(() => createJobSchema.parse({ title: "Job", hackerField: 1 })).toThrow();
  });
});

describe("updateJobSchema", () => {
  it("accepts partial updates and never injects defaults", () => {
    const result = updateJobSchema.parse({ status: JobStatus.COMPLETED });
    expect(result.status).toBe(JobStatus.COMPLETED);
    expect(result.progress).toBeUndefined();
    expect(result.priority).toBeUndefined();
  });

  it("rejects an empty update", () => {
    expect(() => updateJobSchema.parse({})).toThrow();
  });

  it("rejects unknown keys", () => {
    expect(() => updateJobSchema.parse({ userId: "someone-else" })).toThrow();
  });
});
