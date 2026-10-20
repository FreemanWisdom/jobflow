import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import { getDashboardActivities } from "@/lib/tasks/data-access";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const session = (await getSession()) as { user?: { id?: string } } | null;
  if (!session?.user?.id) redirect("/sign-in");
  const activities = await getDashboardActivities(session.user.id);
  return <main className="min-h-screen bg-stone-50 px-5 py-8 text-slate-900 sm:px-8"><div className="mx-auto max-w-4xl"><h1 className="mt-10 text-3xl font-semibold tracking-tight">Activity</h1><p className="mt-2 text-sm text-slate-500">Meaningful changes across your work.</p><section className="mt-8 rounded-lg border border-slate-200 bg-white p-5">{activities.length ? <div className="space-y-5">{activities.map(activity => <Link key={activity.id} href={`/jobs/${activity.jobId}`} className="block border-b border-slate-100 pb-5 last:border-0 last:pb-0"><p className="text-sm text-slate-700">{activity.message}</p><p className="mt-1 text-xs text-slate-500">{activity.jobTitle} · {activity.createdAt.toISOString().slice(0, 16).replace("T", " ")}</p></Link>)}</div> : <p className="text-sm text-slate-500">No activity yet.</p>}</section></div></main>;
}
