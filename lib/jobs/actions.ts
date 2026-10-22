"use server";

import { requireUser } from "@/lib/session";
import { createJob, deleteJob, updateJob } from "./data-access";
import { toCreateJobInput, toUpdateJobInput, statusMap } from "./mapping";
import { toUiJob } from "./presentation";
import type { Job, JobFormData, JobStatus as UiJobStatus } from "@/app/components/job-data";

export async function createJobAction(data: JobFormData): Promise<Job> {
  const { id } = await requireUser();
  return toUiJob(await createJob(toCreateJobInput(data), id));
}

export async function updateJobAction(id: string, data: JobFormData): Promise<Job> {
  const { id: userId } = await requireUser();
  return toUiJob(await updateJob(id, toUpdateJobInput(data), userId));
}

export async function updateJobStatusAction(id: string, status: UiJobStatus): Promise<Job> {
  const { id: userId } = await requireUser();
  // Progress is derived from the transition inside the data layer.
  return toUiJob(await updateJob(id, { status: statusMap[status] }, userId));
}

export async function deleteJobAction(id: string): Promise<void> {
  const { id: userId } = await requireUser();
  await deleteJob(id, userId);
}
