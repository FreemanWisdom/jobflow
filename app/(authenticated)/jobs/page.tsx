import { JobsWorkspace } from "@/app/components/jobs-workspace";
import { getJobs } from "@/lib/jobs/data-access";
import { toUiJobs } from "@/lib/jobs/presentation";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const session = (await getSession()) as { user?: { id?: string; name?: string | null; email?: string | null } } | null;
  if (!session?.user?.id) redirect("/sign-in");
  const jobs = await getJobs({ userId: session.user.id });
  return <JobsWorkspace jobs={toUiJobs(jobs)} />;
}
