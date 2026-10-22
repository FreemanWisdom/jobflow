import Link from "next/link";
import type { ReactNode } from "react";
import type { Job } from "./job-data";

type DashboardJob = Pick<Job, "id" | "title" | "client" | "status" | "priority" | "progress" | "deadline">;
type DashboardProps = {
  stats: { totalJobs: number; activeJobs: number; completedJobs: number; cancelledJobs: number; overdueJobs: number };
  recentJobs: DashboardJob[];
  user: { name?: string | null; email?: string | null };
  dashboardTasks: { id: string; title: string; job: string; dueDate: string; priority: string }[];
  recentActivity: { id: string; jobId: string; description: string; timestamp: string; type: string }[];
};

function StatCard({ title, value, detail }: { title: string; value: number; detail: string }) {
  return <article className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-sm"><p className="text-sm font-medium text-[color:var(--text-muted)]">{title}</p><p className="mt-3 text-3xl font-semibold tracking-[-0.04em]">{value}</p><p className="mt-1 text-xs text-[color:var(--text-muted)]">{detail}</p></article>;
}

function Section({ title, description, href, children }: { title: string; description: string; href: string; children: ReactNode }) {
  return <section className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-sm sm:p-6"><div className="flex items-start justify-between gap-4"><div><h2 className="text-base font-semibold">{title}</h2><p className="mt-1 text-sm text-[color:var(--text-muted)]">{description}</p></div><Link href={href} className="shrink-0 text-sm font-semibold text-[color:var(--accent)]">View all</Link></div><div className="mt-6">{children}</div></section>;
}

export function Dashboard({ stats, recentJobs, user, dashboardTasks, recentActivity }: DashboardProps) {
  return <main className="min-h-screen px-5 py-8 text-[color:var(--foreground)] sm:px-8"><div className="mx-auto max-w-6xl"><div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm sm:p-8"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--accent)]">Workspace overview</p><h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">Dashboard</h1><p className="mt-2 text-sm text-[color:var(--text-muted)]">Welcome back, {user.name ?? user.email ?? "there"}. Here&apos;s the latest from your work.</p><section aria-label="Job statistics" className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><StatCard title="Total jobs" value={stats.totalJobs} detail="All projects in the workspace." /><StatCard title="Active jobs" value={stats.activeJobs} detail="Currently in motion." /><StatCard title="Completed" value={stats.completedJobs} detail="Successfully finished." /><StatCard title="Overdue" value={stats.overdueJobs} detail="Needs attention now." /><StatCard title="Cancelled" value={stats.cancelledJobs} detail="No longer active." /></section><div className="mt-7 grid gap-7 xl:grid-cols-2"><Section title="Recent jobs" description="The jobs you are actively moving forward." href="/jobs">{recentJobs.length ? <div className="divide-y divide-[color:var(--border)]">{recentJobs.map(job => <Link key={job.id} href={`/jobs/${job.id}`} className="block py-4 first:pt-0 last:pb-0"><p className="font-semibold">{job.title}</p><p className="mt-1 text-sm text-[color:var(--text-muted)]">{job.status} · {job.priority} · Due {job.deadline || "No date"}</p></Link>)}</div> : <p className="text-sm text-[color:var(--text-muted)]">No jobs yet.</p>}</Section><Section title="Upcoming tasks" description="The next things that need your attention." href="/tasks">{dashboardTasks.length ? <div className="divide-y divide-[color:var(--border)]">{dashboardTasks.map(task => <Link key={task.id} href="/tasks" className="block py-4 first:pt-0 last:pb-0"><p className="font-semibold">{task.title}</p><p className="mt-1 text-sm text-[color:var(--text-muted)]">{task.job} · {task.dueDate}</p></Link>)}</div> : <p className="text-sm text-[color:var(--text-muted)]">No upcoming tasks.</p>}</Section></div><div className="mt-7"><Section title="Recent activity" description="Meaningful changes across your work." href="/activity">{recentActivity.length ? <div className="grid gap-4 sm:grid-cols-2">{recentActivity.map(activity => <Link key={activity.id} href={`/jobs/${activity.jobId}`} className="rounded-lg border border-[color:var(--border)] p-4 text-sm hover:bg-[color:var(--surface-muted)]">{activity.description}<span className="mt-1 block text-xs text-[color:var(--text-muted)]">{activity.timestamp}</span></Link>)}</div> : <p className="text-sm text-[color:var(--text-muted)]">No activity yet.</p>}</Section></div></div></div></main>;
}
