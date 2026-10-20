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
