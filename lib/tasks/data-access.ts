import "server-only";

import { ActivityType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";

const taskSelect = { id: true, title: true, completed: true, dueDate: true, createdAt: true, updatedAt: true } satisfies Prisma.TaskSelect;
export type TaskRecord = Prisma.TaskGetPayload<{ select: typeof taskSelect }>;
export type ActivityRecord = { id: string; type: ActivityType; message: string; createdAt: Date; jobId: string; jobTitle: string };

async function assertOwnedJob(jobId: string, userId: string) {
  const job = await prisma.job.findFirst({ where: { id: jobId, userId }, select: { id: true, title: true } });
  if (!job) throw new AppError("NOT_FOUND", "Job not found.");
  return job;
}

export async function getJobTasks(jobId: string, userId: string) {
  await assertOwnedJob(jobId, userId);
  return prisma.task.findMany({ where: { jobId }, orderBy: [{ completed: "asc" }, { dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }], select: taskSelect });
}

export async function getJobActivities(jobId: string, userId: string): Promise<ActivityRecord[]> {
  await assertOwnedJob(jobId, userId);
  return prisma.activity.findMany({ where: { jobId }, orderBy: { createdAt: "desc" }, take: 20, select: { id: true, type: true, message: true, createdAt: true, jobId: true, job: { select: { title: true } } } }).then(items => items.map(item => ({ ...item, jobTitle: item.job.title })));
}

export async function getDashboardTasks(userId: string) {
  return prisma.task.findMany({ where: { completed: false, job: { userId } }, orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }], take: 6, select: { ...taskSelect, job: { select: { id: true, title: true, priority: true } } } });
}

export async function getAllUserTasks(userId: string) {
  return prisma.task.findMany({ where: { job: { userId } }, orderBy: [{ completed: "asc" }, { dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }], select: { ...taskSelect, job: { select: { id: true, title: true, priority: true } } } });
}

/**
 * Recent activity for a user. `limit` defaults to the 8-entry dashboard
 * summary; the activity page passes its own page size.
 */
export async function getDashboardActivities(userId: string, limit = 8): Promise<ActivityRecord[]> {
  const take = Math.min(Math.max(Math.trunc(limit) || 8, 1), 200);
  return prisma.activity.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take, select: { id: true, type: true, message: true, createdAt: true, jobId: true, job: { select: { title: true } } } }).then(items => items.map(item => ({ ...item, jobTitle: item.job.title })));
}

export async function createTask(jobId: string, userId: string, title: string, dueDate: string | null) {
  await assertOwnedJob(jobId, userId);
  const cleanTitle = title.trim();
  if (!cleanTitle || cleanTitle.length > 200) throw new AppError("INVALID_INPUT", "Task title is required and must be 200 characters or fewer.");
  const parsedDate = dueDate ? new Date(`${dueDate}T00:00:00.000Z`) : null;
  if (dueDate && Number.isNaN(parsedDate?.getTime())) throw new AppError("INVALID_INPUT", "Task due date is invalid.");
  return prisma.$transaction(async tx => {
    const task = await tx.task.create({ data: { title: cleanTitle, dueDate: parsedDate, jobId }, select: taskSelect });
    await tx.activity.create({ data: { type: ActivityType.TASK_CREATED, message: `Created task “${cleanTitle}”`, jobId, userId } });
    return task;
  });
}

export async function toggleTask(taskId: string, userId: string, completed: boolean) {
  const task = await prisma.task.findFirst({ where: { id: taskId, job: { userId } }, select: { id: true, title: true, jobId: true } });
  if (!task) throw new AppError("NOT_FOUND", "Task not found.");
  return prisma.$transaction(async tx => {
    const updated = await tx.task.update({ where: { id: taskId }, data: { completed }, select: taskSelect });
    await tx.activity.create({ data: { type: completed ? ActivityType.TASK_COMPLETED : ActivityType.TASK_REOPENED, message: `${completed ? "Completed" : "Reopened"} task “${task.title}”`, jobId: task.jobId, userId } });
    return updated;
  });
}

export async function removeTask(taskId: string, userId: string) {
  const task = await prisma.task.findFirst({ where: { id: taskId, job: { userId } }, select: { id: true, title: true, jobId: true } });
  if (!task) throw new AppError("NOT_FOUND", "Task not found.");
  await prisma.$transaction(async tx => {
    await tx.task.delete({ where: { id: taskId } });
    await tx.activity.create({ data: { type: ActivityType.TASK_DELETED, message: `Deleted task “${task.title}”`, jobId: task.jobId, userId } });
  });
}

/**
 * Maximum number of tasks a single bulk request may create.
 */
export const MAX_BULK_TASKS = 50;

const planIdPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{7,99}$/;

export type BulkTaskInput = { title: string; dueDate: string | null };

export type BulkCreateTasksResult = {
  /** True when this plan was already applied; `created` is then empty. */
  duplicate: boolean;
  created: TaskRecord[];
};

const dueDatePattern = /^\d{4}-\d{2}-\d{2}$/;

function parseBulkDueDate(dueDate: string | null) {
  if (!dueDate) return null;
  if (!dueDatePattern.test(dueDate)) throw new AppError("INVALID_INPUT", "Task due date is invalid.");
  const [year, month, day] = dueDate.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  // Reject impossible calendar dates that JavaScript would silently
  // normalize (e.g. 2026-02-30 -> March 2): the components must round-trip.
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    throw new AppError("INVALID_INPUT", "Task due date is invalid.");
  }
  return parsed;
}

/**
 * Create many tasks on one job in a single transaction and log one summary
 * activity. The whole batch is validated before anything is written, so a
 * request either lands completely or not at all.
 *
 * Duplicate-request protection: `planId` identifies the plan (a
 * client-generated id such as a UUID). If a TASK_CREATED activity carrying
 * the same `[plan:<id>]` marker already exists for this job and user, nothing
 * is inserted and `{ duplicate: true }` is returned, making retries safe. A
 * transaction-scoped advisory lock serializes concurrent retries so the
 * marker check cannot race. The bracketed marker is matched literally, so
 * plan ids that are prefixes of each other never collide.
 */
export async function createTasksBulk(jobId: string, userId: string, planId: string, tasks: BulkTaskInput[]): Promise<BulkCreateTasksResult> {
  await assertOwnedJob(jobId, userId);

  const cleanPlanId = typeof planId === "string" ? planId.trim() : "";
  if (!planIdPattern.test(cleanPlanId)) throw new AppError("INVALID_INPUT", "Plan id is required and must be 8-100 letters, digits, hyphens or underscores.");

  const list = Array.isArray(tasks) ? tasks : [];
  if (list.length === 0) throw new AppError("INVALID_INPUT", "At least one task is required.");
  if (list.length > MAX_BULK_TASKS) throw new AppError("INVALID_INPUT", `A bulk request may create at most ${MAX_BULK_TASKS} tasks.`);

  const prepared = list.map(task => {
    const cleanTitle = typeof task?.title === "string" ? task.title.trim() : "";
    if (!cleanTitle || cleanTitle.length > 200) throw new AppError("INVALID_INPUT", "Task titles are required and must be 200 characters or fewer.");
    return { title: cleanTitle, dueDate: parseBulkDueDate(task.dueDate ?? null) };
  });

  const marker = `[plan:${cleanPlanId}]`;
  return prisma.$transaction(async tx => {
    // Serialize retries of the same plan: a concurrent duplicate blocks here
    // until the first transaction commits, then sees the marker below.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${marker}))`;
    // Literal substring match via strpos: Prisma's `contains` uses LIKE
    // semantics on PostgreSQL where `_` matches any single character, which
    // would cross-match plan ids that differ only in underscore/hyphen
    // positions. strpos has no wildcard interpretation.
    const prior = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "Activity"
      WHERE "jobId" = ${jobId} AND "userId" = ${userId} AND "type" = 'TASK_CREATED'
        AND strpos("message", ${marker}) > 0
      LIMIT 1`;
    if (prior.length > 0) return { duplicate: true, created: [] as TaskRecord[] };

    const created: TaskRecord[] = [];
    for (const task of prepared) {
      created.push(await tx.task.create({ data: { title: task.title, dueDate: task.dueDate, jobId }, select: taskSelect }));
    }
    await tx.activity.create({ data: { type: ActivityType.TASK_CREATED, message: `Created ${created.length} tasks in bulk (${marker})`, jobId, userId } });
    return { duplicate: false, created };
  });
}
