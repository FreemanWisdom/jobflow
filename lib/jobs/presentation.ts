import "server-only";

import type { DashboardStats, JobRecord } from "./data-access";
import type { Job } from "@/app/components/job-data";

const statusLabels = {
  PLANNING: "Planning",
  IN_PROGRESS: "In Progress",
  ON_HOLD: "On Hold",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
} as const;

const priorityLabels = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
} as const;

function formatDate(value: Date | null): string {
  return value ? value.toISOString().slice(0, 10) : "";
}

function formatBudget(value: string | null): string {
  if (!value) return "";
  const [whole, decimals] = value.split(".");
  const groupedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `$${groupedWhole}.${decimals ?? "00"}`;
}

export function toUiJob(job: JobRecord): Job {
  return {
    id: job.id,
    title: job.title,
    description: job.description ?? "",
    client: job.client ?? "",
    status: statusLabels[job.status],
    priority: priorityLabels[job.priority],
    deadline: formatDate(job.deadline),
    budget: formatBudget(job.budget),
    progress: job.progress,
    createdAt: formatDate(job.createdAt),
    updatedAt: formatDate(job.updatedAt),
  };
}

export function toUiJobs(jobs: JobRecord[]): Job[] {
  return jobs.map(toUiJob);
}

export function toDashboardData(stats: DashboardStats) {
  return {
    stats: {
      totalJobs: stats.totalJobs,
      activeJobs: stats.activeJobs,
      completedJobs: stats.completedJobs,
      cancelledJobs: stats.cancelledJobs,
      overdueJobs: stats.overdueJobs,
    },
    recentJobs: toUiJobs(stats.recentJobs),
  };
}
