"use server";

import { compare, hash } from "bcryptjs";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function changePasswordAction(currentPassword: string, newPassword: string, confirmation: string) {
  const { id } = await requireUser();
  if (newPassword.length < 8 || newPassword !== confirmation) throw new Error("INVALID_PASSWORD");
  const user = await prisma.user.findUnique({ where: { id }, select: { passwordHash: true } });
  if (!user?.passwordHash || !(await compare(currentPassword, user.passwordHash))) throw new Error("INVALID_PASSWORD");
  await prisma.user.update({ where: { id }, data: { passwordHash: await hash(newPassword, 12) } });
}

export async function exportDataAction() {
  const { id } = await requireUser();
  const user = await prisma.user.findUnique({ where: { id }, select: { name: true, email: true } });
  const jobs = await prisma.job.findMany({ where: { userId: id }, select: { id: true, title: true, description: true, client: true, status: true, priority: true, deadline: true, budget: true, progress: true, createdAt: true, updatedAt: true } }).then(rows => rows.map(job => ({ ...job, deadline: job.deadline?.toISOString() ?? null, budget: job.budget?.toFixed(2) ?? null })));
  const jobIds = jobs.map(job => job.id);
  const [tasks, activity] = await Promise.all([prisma.task.findMany({ where: { jobId: { in: jobIds } }, select: { id: true, title: true, completed: true, dueDate: true, createdAt: true, updatedAt: true, jobId: true } }).then(rows => rows.map(task => ({ ...task, dueDate: task.dueDate?.toISOString() ?? null }))), prisma.activity.findMany({ where: { userId: id }, select: { id: true, type: true, message: true, createdAt: true, jobId: true } }).then(rows => rows.map(entry => ({ ...entry, type: entry.type as string, createdAt: entry.createdAt.toISOString() })))]);
  return { version: 1, exportedAt: new Date().toISOString(), user, jobs, tasks, activity };
}
