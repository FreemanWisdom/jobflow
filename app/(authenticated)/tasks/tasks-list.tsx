"use client";

import Link from "next/link";
import { useState } from "react";
import { toggleTaskAction } from "@/lib/tasks/actions";

type TaskItem = {
  id: string;
  title: string;
  completed: boolean;
  dueDate: string;
  job: { id: string; title: string; priority: string };
};

export function TasksList({ initialTasks }: { initialTasks: TaskItem[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function toggle(task: TaskItem) {
    if (pendingId) return;
    setPendingId(task.id);
    setError("");
    try {
      const updated = await toggleTaskAction(task.id, !task.completed);
      setTasks(current => current.map(item => (item.id === updated.id ? { ...item, completed: updated.completed, updatedAt: updated.updatedAt.toISOString() } : item)));
    } catch {
      setError("The task could not be updated. Please try again.");
    } finally {
      setPendingId(null);
    }
  }

  if (!tasks.length) {
    return <section className="mt-8 rounded-lg border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">No tasks yet. Add tasks from any job&apos;s detail page.</p></section>;
  }

  return <section className="mt-8 rounded-lg border border-slate-200 bg-white p-5">{error && <p role="alert" className="mb-4 rounded-md bg-rose-50 p-3 text-sm font-medium text-rose-700">{error}</p>}<div className="divide-y divide-slate-100">{tasks.map(task => <div key={task.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0"><button type="button" role="checkbox" aria-checked={task.completed} aria-label={task.completed ? `Reopen task ${task.title}` : `Mark task ${task.title} complete`} disabled={pendingId === task.id} onClick={() => toggle(task)} className={`grid h-5 w-5 shrink-0 place-items-center rounded border transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:opacity-50 ${task.completed ? "border-violet-700 bg-violet-700 text-white" : "border-slate-300 bg-white hover:border-violet-500"}`}>{task.completed ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg> : null}</button><span className="min-w-0 flex-1"><Link href={`/jobs/${task.job.id}`} className="block"><span className={`block font-semibold text-slate-800 ${task.completed ? "line-through opacity-60" : ""}`}>{task.title}</span><span className="mt-1 block text-sm text-slate-500">{task.job.title} · {task.dueDate ? `Due ${task.dueDate}` : "No due date"}</span></Link></span><span className="text-xs font-semibold text-slate-500">{task.completed ? "Done" : task.job.priority}</span></div>)}</div></section>;
}
