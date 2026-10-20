import { notFound, redirect } from "next/navigation";
import { JobDetail } from "./job-detail";
import { getJobById } from "@/lib/jobs/data-access";
import { toUiJob } from "@/lib/jobs/presentation";
import { getSession } from "@/lib/auth-server";
import { getJobActivities, getJobTasks } from "@/lib/tasks/data-access";

export const dynamic = "force-dynamic";

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = (await getSession()) as { user?: { id?: string } } | null;
  if (!session?.user?.id) redirect("/sign-in");
  const { id } = await params;
  // Validate ownership before loading dependent data: a missing or foreign job
  // id must resolve to a 404, never an error page or another user's data.
  const job = await getJobById(id, session.user.id);
  if (!job) notFound();
  const [tasks, activities] = await Promise.all([getJobTasks(id, session.user.id), getJobActivities(id, session.user.id)]);
  return <JobDetail initialJob={toUiJob(job)} initialTasks={tasks.map(task => ({ id: task.id, title: task.title, completed: task.completed, dueDate: task.dueDate?.toISOString().slice(0, 10) ?? "", createdAt: task.createdAt.toISOString(), updatedAt: task.updatedAt.toISOString() }))} initialActivities={activities.map(activity => ({ id: activity.id, message: activity.message, createdAt: activity.createdAt.toISOString(), jobTitle: activity.jobTitle }))} />;
}
