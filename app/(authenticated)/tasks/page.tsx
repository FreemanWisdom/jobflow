import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import { getAllUserTasks } from "@/lib/tasks/data-access";
import { TasksList } from "./tasks-list";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const session = (await getSession()) as { user?: { id?: string } } | null;
  if (!session?.user?.id) redirect("/sign-in");
  const tasks = await getAllUserTasks(session.user.id);
  const priorityLabels = { LOW: "Low", MEDIUM: "Medium", HIGH: "High", URGENT: "Urgent" } as const;
  return <main className="min-h-screen bg-stone-50 px-5 py-8 text-slate-900 sm:px-8"><div className="mx-auto max-w-4xl"><h1 className="mt-10 text-3xl font-semibold tracking-tight">Tasks</h1><p className="mt-2 text-sm text-slate-500">All tasks across your jobs. Check a task off when it is done.</p><TasksList initialTasks={tasks.map(task => ({ id: task.id, title: task.title, completed: task.completed, dueDate: task.dueDate?.toISOString().slice(0, 10) ?? "", job: { id: task.job.id, title: task.job.title, priority: priorityLabels[task.job.priority] } }))} /></div></main>;
}
