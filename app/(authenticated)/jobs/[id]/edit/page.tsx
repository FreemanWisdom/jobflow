import { notFound, redirect } from "next/navigation";
import { getJobById } from "@/lib/jobs/data-access";
import { toUiJob } from "@/lib/jobs/presentation";
import { getSession } from "@/lib/auth-server";
import { EditJobForm } from "./edit-form";

export const dynamic = "force-dynamic";

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const session = (await getSession()) as { user?: { id?: string } } | null;
  if (!session?.user?.id) redirect("/sign-in");
  const { id } = await params;
  const job = await getJobById(id, session.user.id);
  if (!job) notFound();
  return <main className="min-h-screen bg-stone-50 px-5 py-8 text-slate-900 sm:px-8"><div className="mx-auto max-w-3xl"><p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-700">Job workflow</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Edit {job.title}</h1><p className="mt-2 text-sm text-slate-500">Update this job and keep its workflow moving.</p><div className="mt-8 rounded-lg border border-slate-200 bg-white p-5 sm:p-7"><EditJobForm job={toUiJob(job)} /></div></div></main>;
}
