import { Dashboard } from "@/app/components/dashboard";
import { getDashboardStats } from "@/lib/jobs/data-access";
import { toDashboardData } from "@/lib/jobs/presentation";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import { getDashboardActivities, getDashboardTasks } from "@/lib/tasks/data-access";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = (await getSession()) as { user?: { id?: string; name?: string | null; email?: string | null } } | null;
  if (!session?.user?.id) redirect("/sign-in");
  const [stats, tasks, activities] = await Promise.all([getDashboardStats(session.user.id), getDashboardTasks(session.user.id), getDashboardActivities(session.user.id)]);
  const priorityLabels = { LOW: "Low", MEDIUM: "Medium", HIGH: "High", URGENT: "Urgent" } as const;
  return <Dashboard user={session.user} {...toDashboardData(stats)} dashboardTasks={tasks.map(task => ({ id: task.id, title: task.title, job: task.job.title, dueDate: task.dueDate?.toISOString().slice(0, 10) ?? "No due date", priority: priorityLabels[task.job.priority] }))} recentActivity={activities.map(activity => ({ id: activity.id, jobId: activity.jobId, description: activity.message, timestamp: activity.createdAt.toISOString(), type: activity.type.includes("TASK_COMPLETED") ? "complete" : activity.type.includes("CREATED") ? "create" : "update" }))} />;
}
