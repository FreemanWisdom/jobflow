import { describe, expect, it } from "vitest";
import {
  applyStatusProgressRule,
  buildUpdateActivityMessage,
  chooseUpdateActivityType,
  toCreateJobInput,
  toUpdateJobInput,
  type ComparableJob,
} from "@/lib/jobs/mapping";
import { ActivityType, JobPriority, JobStatus } from "@prisma/client";

const form = {
  title: "Website Redesign",
  description: "Refresh the site",
  client: "GreenTech",
  status: "In Progress" as const,
  priority: "High" as const,
  deadline: "2026-09-01",
  budget: "$4,800",
};

describe("toCreateJobInput progress rule", () => {
  it("starts non-completed jobs at 0%", () => {
    expect(toCreateJobInput(form).progress).toBe(0);
  });
  it("starts jobs created directly as Completed at 100%", () => {
    expect(toCreateJobInput({ ...form, status: "Completed" }).progress).toBe(100);
  });
});

describe("toUpdateJobInput", () => {
  it("never includes progress, so edits cannot silently reset it", () => {
    const input = toUpdateJobInput(form) as Record<string, unknown>;
    expect("progress" in input).toBe(false);
    expect(input).toEqual({
      title: "Website Redesign",
      description: "Refresh the site",
      client: "GreenTech",
      status: JobStatus.IN_PROGRESS,
      priority: JobPriority.HIGH,
      deadline: "2026-09-01",
      budget: "$4,800",
    });
  });
});

describe("applyStatusProgressRule", () => {
  it("forces 100% when moving to COMPLETED", () => {
    expect(applyStatusProgressRule({ status: JobStatus.COMPLETED }, JobStatus.IN_PROGRESS).progress).toBe(100);
  });
  it("resets to 0% when leaving COMPLETED", () => {
    expect(applyStatusProgressRule({ status: JobStatus.IN_PROGRESS }, JobStatus.COMPLETED).progress).toBe(0);
  });
  it("preserves progress when status does not change or stays non-completed", () => {
    const withTitle: { title: string; status?: JobStatus } = { title: "x" };
    expect(applyStatusProgressRule(withTitle, JobStatus.IN_PROGRESS)).not.toHaveProperty("progress");
    expect(applyStatusProgressRule({ status: JobStatus.IN_PROGRESS }, JobStatus.PLANNING)).not.toHaveProperty("progress");
  });
  it("respects an explicit progress value", () => {
    expect(applyStatusProgressRule({ status: JobStatus.COMPLETED, progress: 80 }, JobStatus.IN_PROGRESS).progress).toBe(80);
  });
});

const base: ComparableJob = {
  title: "Website Redesign",
  description: "Refresh the site",
  client: "GreenTech",
  status: JobStatus.IN_PROGRESS,
  priority: JobPriority.HIGH,
  deadline: "2026-09-01",
  budget: "4800.00",
};

describe("chooseUpdateActivityType", () => {
  it("returns null when nothing changed", () => {
    expect(chooseUpdateActivityType(base, { ...base })).toBeNull();
  });
  it("classifies a status change", () => {
    expect(chooseUpdateActivityType(base, { ...base, status: JobStatus.COMPLETED })).toBe(ActivityType.STATUS_CHANGED);
  });
  it("classifies a priority-only change", () => {
    expect(chooseUpdateActivityType(base, { ...base, priority: JobPriority.URGENT })).toBe(ActivityType.PRIORITY_CHANGED);
  });
  it("classifies a deadline-only change", () => {
    expect(chooseUpdateActivityType(base, { ...base, deadline: "2026-10-01" })).toBe(ActivityType.DUE_DATE_CHANGED);
  });
  it("classifies an ordinary field edit as JOB_UPDATED", () => {
    expect(chooseUpdateActivityType(base, { ...base, title: "New Title" })).toBe(ActivityType.JOB_UPDATED);
    expect(chooseUpdateActivityType(base, { ...base, client: "Other Co" })).toBe(ActivityType.JOB_UPDATED);
    expect(chooseUpdateActivityType(base, { ...base, budget: "5000.00" })).toBe(ActivityType.JOB_UPDATED);
  });
  it("gives status precedence when multiple fields change", () => {
    expect(chooseUpdateActivityType(base, { ...base, status: JobStatus.ON_HOLD, title: "New Title" })).toBe(ActivityType.STATUS_CHANGED);
    expect(chooseUpdateActivityType(base, { ...base, priority: JobPriority.LOW, deadline: "" })).toBe(ActivityType.PRIORITY_CHANGED);
  });
  it("treats an unset deadline and empty string equivalently", () => {
    expect(chooseUpdateActivityType({ ...base, deadline: "" }, { ...base, deadline: "" })).toBeNull();
  });
});

describe("buildUpdateActivityMessage", () => {
  it("describes status transitions with both states", () => {
    const after = { ...base, status: JobStatus.ON_HOLD };
    expect(buildUpdateActivityMessage(ActivityType.STATUS_CHANGED, base, after)).toBe("Changed status from In Progress to On Hold");
  });
  it("describes priority and due-date changes", () => {
    expect(buildUpdateActivityMessage(ActivityType.PRIORITY_CHANGED, base, { ...base, priority: JobPriority.LOW })).toBe("Changed priority from High to Low");
    expect(buildUpdateActivityMessage(ActivityType.DUE_DATE_CHANGED, base, { ...base, deadline: "2026-10-01" })).toBe("Changed due date to 2026-10-01");
  });
  it("handles a removed due date", () => {
    expect(buildUpdateActivityMessage(ActivityType.DUE_DATE_CHANGED, base, { ...base, deadline: "" })).toBe("Removed the due date");
  });
});
