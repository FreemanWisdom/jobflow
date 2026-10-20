"use server";

import { JobPriority, JobStatus } from "@prisma/client";
import { requireUser } from "@/lib/session";
import { createJob, deleteJob, updateJob } from "./data-access";
import { toUiJob } from "./presentation";
import type { Job, JobFormData, JobPriority as UiJobPriority, JobStatus as UiJobStatus } from "@/app/components/job-data";

const statusMap: Record<UiJobStatus, JobStatus> = {
  Planning: JobStatus.PLANNING,
  "In Progress": JobStatus.IN_PROGRESS,
  "On Hold": JobStatus.ON_HOLD,
  Completed: JobStatus.COMPLETED,
  Cancelled: JobStatus.CANCELLED,
};

const priorityMap: Record<UiJobPriority, JobPriority> = {
  Low: JobPriority.LOW,
  Medium: JobPriority.MEDIUM,
  High: JobPriority.HIGH,
  Urgent: JobPriority.URGENT,
};

function toDatabaseInput(data: JobFormData) {
  return {
    title: data.title,
    description: data.description || null,
    client: data.client || null,
    status: statusMap[data.status],
    priority: priorityMap[data.priority],
    deadline: data.deadline || null,
    budget: data.budget || null,
    progress: data.status === "Completed" ? 100 : 0,
  };
}

export async function createJobAction(data: JobFormData): Promise<Job> {
  const { id } = await requireUser();
  return toUiJob(await createJob(toDatabaseInput(data), id));
}

export async function updateJobAction(id: string, data: JobFormData): Promise<Job> {
  const { id: userId } = await requireUser();
  return toUiJob(await updateJob(id, toDatabaseInput(data), userId));
}

export async function updateJobStatusAction(id: string, status: UiJobStatus): Promise<Job> {
  const { id: userId } = await requireUser();
  return toUiJob(await updateJob(id, { status: statusMap[status], ...(status === "Completed" ? { progress: 100 } : {}) }, userId));
}

export async function deleteJobAction(id: string): Promise<void> {
  const { id: userId } = await requireUser();
  await deleteJob(id, userId);
}
