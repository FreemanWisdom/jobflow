"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateJobAction } from "@/lib/jobs/actions";
import { jobPriorities, jobStatuses, type Job, type JobFormData } from "@/app/components/job-data";

export function EditJobForm({ job }: { job: Job }) {
  const router = useRouter();
  const [data, setData] = useState<JobFormData>({ title: job.title, description: job.description, client: job.client, status: job.status, priority: job.priority, deadline: job.deadline, budget: job.budget });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const update = (key: keyof JobFormData, value: string) => setData(current => ({ ...current, [key]: value }));
  async function submit(event: React.FormEvent) { event.preventDefault(); setPending(true); setError(""); try { await updateJobAction(job.id, data); router.push(`/jobs/${job.id}`); router.refresh(); } catch { setError("The job could not be updated. Check the fields and try again."); setPending(false); } }
  const input = "w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800";
  return <form onSubmit={submit} className="space-y-5">{error && <p role="alert" className="rounded-md bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}<label className="block text-sm font-medium">Title<input required maxLength={100} value={data.title} onChange={event => update("title", event.target.value)} className={`${input} mt-2`} /></label><label className="block text-sm font-medium">Description<textarea maxLength={1000} value={data.description} onChange={event => update("description", event.target.value)} className={`${input} mt-2`} rows={5} /></label><label className="block text-sm font-medium">Client<input maxLength={200} value={data.client} onChange={event => update("client", event.target.value)} className={`${input} mt-2`} /></label><div className="grid gap-5 sm:grid-cols-2"><label className="block text-sm font-medium">Status<select value={data.status} onChange={event => update("status", event.target.value)} className={`${input} mt-2`}>{jobStatuses.map(value => <option key={value}>{value}</option>)}</select></label><label className="block text-sm font-medium">Priority<select value={data.priority} onChange={event => update("priority", event.target.value)} className={`${input} mt-2`}>{jobPriorities.map(value => <option key={value}>{value}</option>)}</select></label><label className="block text-sm font-medium">Due date<input type="date" value={data.deadline} onChange={event => update("deadline", event.target.value)} className={`${input} mt-2`} /></label><label className="block text-sm font-medium">Budget<input value={data.budget} onChange={event => update("budget", event.target.value)} className={`${input} mt-2`} placeholder="$2,500" /></label></div><div className="flex justify-end gap-3 border-t border-slate-100 pt-5"><button type="button" onClick={() => router.push(`/jobs/${job.id}`)} className="rounded-md border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancel</button><button disabled={pending} className="rounded-md bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{pending ? "Saving..." : "Save changes"}</button></div></form>;
}
