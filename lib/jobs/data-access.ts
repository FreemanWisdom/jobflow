import "server-only";

import { ActivityType, JobPriority, JobStatus, Prisma } from "@prisma/client";
import { AppError, toDatabaseError } from "../errors";
import { prisma } from "../prisma";
import { applyStatusProgressRule, buildUpdateActivityMessage, chooseUpdateActivityType, type ComparableJob } from "./mapping";
import {
  createJobSchema,
  updateJobSchema,
  type CreateJobInput,
  type UpdateJobInput,
  type ValidatedCreateJobInput,
  type ValidatedUpdateJobInput,
} from "./validation";

const jobSelect = {
  id: true,
  title: true,
  description: true,
  client: true,
  status: true,
  priority: true,
  deadline: true,
  budget: true,
  progress: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.JobSelect;

type SelectedJob = Prisma.JobGetPayload<{ select: typeof jobSelect }>;
export type JobRecord = Omit<SelectedJob, "budget"> & { budget: string | null };

function serializeJob(job: SelectedJob): JobRecord {
  return { ...job, budget: job.budget?.toFixed(2) ?? null };
}

function toComparable(job: SelectedJob): ComparableJob {
  return {
    title: job.title,
    description: job.description,
    client: job.client,
    status: job.status,
    priority: job.priority,
    deadline: job.deadline?.toISOString().slice(0, 10) ?? "",
    budget: job.budget?.toFixed(2) ?? null,
  };
}

function validateInput<T>(schema: { parse: (input: T) => ValidatedCreateJobInput | ValidatedUpdateJobInput }, input: T): ValidatedCreateJobInput | ValidatedUpdateJobInput {
  try {
    return schema.parse(input);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("INVALID_INPUT", "The job data is invalid.", { cause: error });
  }
}

export type JobSort = "newest" | "oldest" | "deadlineSoonest" | "deadlineLatest";
export type GetJobsOptions = {
  userId?: string;
  status?: JobStatus;
  priority?: JobPriority;
  search?: string;
  sort?: JobSort;
  limit?: number;
  offset?: number;
};

export async function getJobs(options: GetJobsOptions = {}): Promise<JobRecord[]> {
  const { userId, status, priority, search, sort = "newest", limit, offset } = options;
  if (!userId) throw new AppError("INVALID_INPUT", "A user session is required.");
  const where: Prisma.JobWhereInput = {
    userId,
    ...(status ? { status } : {}),
    ...(priority ? { priority } : {}),
    ...(search?.trim()
      ? { OR: [{ title: { contains: search.trim(), mode: "insensitive" } }, { client: { contains: search.trim(), mode: "insensitive" } }, { description: { contains: search.trim(), mode: "insensitive" } }] }
      : {}),
  };
  const orderBy: Prisma.JobOrderByWithRelationInput[] = sort === "oldest"
    ? [{ createdAt: "asc" }]
    : sort === "deadlineSoonest"
      ? [{ deadline: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }]
      : sort === "deadlineLatest"
        ? [{ deadline: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }]
        : [{ createdAt: "desc" }];

  try {
    const jobs = await prisma.job.findMany({ where, orderBy, select: jobSelect, ...(limit ? { take: limit, skip: offset ?? 0 } : {}) });
    return jobs.map(serializeJob);
  } catch (error) {
    throw toDatabaseError("get jobs", error);
  }
}

export async function getJobById(id: string, userId: string): Promise<JobRecord | null> {
  try {
    const job = await prisma.job.findFirst({ where: { id, userId }, select: jobSelect });
    return job ? serializeJob(job) : null;
  } catch (error) {
    throw toDatabaseError("get job", error);
  }
}

export async function createJob(input: CreateJobInput, userId: string): Promise<JobRecord> {
  const data = validateInput(createJobSchema, input) as ValidatedCreateJobInput;
  try {
    const job = await prisma.$transaction(async tx => {
      // The documented initial-progress rule: jobs created directly as
      // Completed start at 100%; everything else starts at 0%.
      const progress = data.status === JobStatus.COMPLETED ? 100 : (data.progress ?? 0);
      const created = await tx.job.create({ data: { ...data, progress, userId }, select: jobSelect });
      await tx.activity.create({ data: { type: ActivityType.JOB_CREATED, message: `Created job “${created.title}”`, jobId: created.id, userId } });
      return created;
    });
    return serializeJob(job);
  } catch (error) {
    throw toDatabaseError("create job", error);
  }
}

export async function updateJob(id: string, input: UpdateJobInput, userId: string): Promise<JobRecord> {
  const data = validateInput(updateJobSchema, input) as ValidatedUpdateJobInput;
  try {
    const job = await prisma.$transaction(async tx => {
      // Ownership check and mutation happen inside one transaction so a foreign
      // or missing job can never be mutated, and the update reads the same
      // row it validates against.
      const existing = await tx.job.findFirst({ where: { id, userId }, select: jobSelect });
      if (!existing) throw new AppError("NOT_FOUND", "Job not found.");
      const patch = applyStatusProgressRule(data, existing.status);
      const updated = await tx.job.update({ where: { id }, data: patch, select: jobSelect });
      const type = chooseUpdateActivityType(toComparable(existing), toComparable(updated));
      if (type) {
        const message = buildUpdateActivityMessage(type, toComparable(existing), toComparable(updated));
        await tx.activity.create({ data: { type, message, jobId: id, userId } });
      }
      return updated;
    });
    return serializeJob(job);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw toDatabaseError("update job", error);
  }
}

export async function deleteJob(id: string, userId: string): Promise<void> {
  try {
    const result = await prisma.job.deleteMany({ where: { id, userId } });
    if (result.count === 0) throw new AppError("NOT_FOUND", "Job not found.");
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw toDatabaseError("delete job", error);
  }
}

export type DashboardStats = {
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  cancelledJobs: number;
  overdueJobs: number;
  dueSoonJobs: number;
  averageProgress: number;
  recentJobs: JobRecord[];
};

/**
 * Stat definitions (documented, kept consistent with the dashboard labels):
 * - totalJobs: every job owned by the user.
 * - activeJobs: PLANNING + IN_PROGRESS + ON_HOLD.
 * - completedJobs / cancelledJobs: those terminal statuses.
 * - overdueJobs: deadline in the past and not yet in a terminal status.
 * - dueSoonJobs: deadline within the next 7 days, not yet terminal.
 */
export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const now = new Date();
  const dueSoon = new Date(now);
  dueSoon.setUTCDate(dueSoon.getUTCDate() + 7);
  try {
    const [totalJobs, activeJobs, completedJobs, cancelledJobs, overdueJobs, dueSoonJobs, progress, recentJobs] = await Promise.all([
      prisma.job.count({ where: { userId } }),
      prisma.job.count({ where: { userId, status: { in: [JobStatus.PLANNING, JobStatus.IN_PROGRESS, JobStatus.ON_HOLD] } } }),
      prisma.job.count({ where: { userId, status: JobStatus.COMPLETED } }),
      prisma.job.count({ where: { userId, status: JobStatus.CANCELLED } }),
      prisma.job.count({ where: { userId, deadline: { lt: now }, status: { notIn: [JobStatus.COMPLETED, JobStatus.CANCELLED] } } }),
      prisma.job.count({ where: { userId, deadline: { gte: now, lte: dueSoon }, status: { notIn: [JobStatus.COMPLETED, JobStatus.CANCELLED] } } }),
      prisma.job.aggregate({ where: { userId }, _avg: { progress: true } }),
      prisma.job.findMany({ where: { userId }, orderBy: { updatedAt: "desc" }, take: 5, select: jobSelect }),
    ]);
    return { totalJobs, activeJobs, completedJobs, cancelledJobs, overdueJobs, dueSoonJobs, averageProgress: Math.round(progress._avg.progress ?? 0), recentJobs: recentJobs.map(serializeJob) };
  } catch (error) {
    throw toDatabaseError("get dashboard statistics", error);
  }
}
