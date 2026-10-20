import { describe, expect, it } from "vitest";
import { toDashboardData, toUiJob } from "@/lib/jobs/presentation";
import type { DashboardStats, JobRecord } from "@/lib/jobs/data-access";
import { JobPriority, JobStatus } from "@prisma/client";

const record: JobRecord = {
  id: "job-1",
  title: "Website Redesign",
  description: null,
  client: "GreenTech",
  status: JobStatus.IN_PROGRESS,
  priority: JobPriority.HIGH,
  deadline: new Date("2026-09-01T00:00:00.000Z"),
  budget: "4800.00",
  progress: 68,
  createdAt: new Date("2026-08-01T10:00:00.000Z"),
  updatedAt: new Date("2026-08-15T10:00:00.000Z"),
};

describe("toUiJob", () => {
  it("maps enum values to UI labels", () => {
    const ui = toUiJob(record);
    expect(ui.status).toBe("In Progress");
    expect(ui.priority).toBe("High");
  });
  it("formats dates as YYYY-MM-DD and budgets as currency", () => {
    const ui = toUiJob(record);
    expect(ui.deadline).toBe("2026-09-01");
    expect(ui.budget).toBe("$4,800.00");
  });
  it("handles missing optional values", () => {
    const ui = toUiJob({ ...record, description: null, client: null, deadline: null, budget: null });
    expect(ui.description).toBe("");
    expect(ui.client).toBe("");
    expect(ui.deadline).toBe("");
    expect(ui.budget).toBe("");
  });
  it("groups thousands in large budgets", () => {
    expect(toUiJob({ ...record, budget: "1250000.00" }).budget).toBe("$1,250,000.00");
  });
});

describe("toDashboardData", () => {
  it("passes through the documented stats and maps recent jobs", () => {
    const stats: DashboardStats = {
      totalJobs: 10,
      activeJobs: 6,
      completedJobs: 3,
      cancelledJobs: 1,
      overdueJobs: 2,
      dueSoonJobs: 4,
      averageProgress: 55,
      recentJobs: [record],
    };
    const data = toDashboardData(stats);
    expect(data.stats).toEqual({ totalJobs: 10, activeJobs: 6, completedJobs: 3, cancelledJobs: 1, overdueJobs: 2 });
    expect(data.recentJobs[0].title).toBe("Website Redesign");
  });
});
