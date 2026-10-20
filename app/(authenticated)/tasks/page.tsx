import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import { getAllUserTasks } from "@/lib/tasks/data-access";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const session = (await getSession()) as { user?: { id?: string } } | null;
  if (!session?.user?.id) redirect("/sign-in");
  const tasks = await getAllUserTasks(session.user.id);
  return <main className="min-h-screen bg-stone-50 px-5 py-8 text-slate-900 sm:px-8"><div className="mx-auto max-w-4xl"><h1 className="mt-10 text-3xl font-semibold tracking-tight">Tasks</h1><p className="mt-2 text-sm text-slate-500">Incomplete work across your Jobs.</p><section className="mt-8 rounded-lg border border-slate-200 bg-white p-5">{tasks.length ? <div className="divide-y divide-slate-100">{tasks.map(task => <Link key={task.id} href={`/jobs/${task.job.id}`} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0"><span className="h-4 w-4 rounded border border-slate-300"/><span className="min-w-0 flex-1"><span className="block font-semibold text-slate-800">{task.title}</span><span className="mt-1 block text-sm text-slate-500">{task.job.title} · {task.dueDate ? `Due ${task.dueDate.toISOString().slice(0, 10)}` : "No due date"}</span></span><span className="text-xs font-semibold text-slate-500">{task.job.priority}</span></Link>)}</div> : <p className="text-sm text-slate-500">No upcoming tasks.</p>}</section></div></main>;
}
