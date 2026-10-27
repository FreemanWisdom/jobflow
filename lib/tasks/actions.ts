"use server";

import { requireUser } from "@/lib/session";
import { createTask, createTasksBulk, removeTask, toggleTask } from "./data-access";

export async function createTaskAction(jobId: string, title: string, dueDate: string | null) { const { id } = await requireUser(); return createTask(jobId, id, title, dueDate); }
export async function toggleTaskAction(taskId: string, completed: boolean) { const { id } = await requireUser(); return toggleTask(taskId, id, completed); }
export async function deleteTaskAction(taskId: string) { const { id } = await requireUser(); await removeTask(taskId, id); }
export async function createTasksBulkAction(jobId: string, planId: string, tasks: { title: string; dueDate: string | null }[]) {
  const { id } = await requireUser();
  return createTasksBulk(jobId, id, planId, tasks);
}
