"use server";

import { requireUser } from "@/lib/session";
import { getJobById } from "@/lib/jobs/data-access";
import { AppError, type AppErrorCode } from "@/lib/errors";
import { generateTaskPlan, type PlanDraft } from "./generate-plan";

/**
 * Server action that generates an AI task-plan draft for one of the signed-in
 * user's jobs. Ownership is enforced through the existing `getJobById`
 * (findFirst on id + userId) before any AI call is made. Nothing is written
 * to the database here: the draft is returned to the client for review, and
 * is only persisted through `createTasksBulkAction` after explicit approval.
 *
 * Failures are returned as data (not thrown) so the client can show
 * actionable messages; Next.js masks thrown server-action errors in
 * production, which would hide configuration and rate-limit hints.
 */
export type PlanGeneration =
  | { ok: true; draft: PlanDraft }
  | { ok: false; error: AppErrorCode; message: string };

export async function generatePlanAction(jobId: string, goal: string): Promise<PlanGeneration> {
  const { id } = await requireUser();
  const job = await getJobById(jobId, id);
  if (!job) return { ok: false, error: "NOT_FOUND", message: "Job not found." };

  try {
    const draft = await generateTaskPlan(
      {
        title: job.title,
        description: job.description,
        client: job.client,
        deadline: job.deadline ? job.deadline.toISOString().slice(0, 10) : null,
        status: job.status,
      },
      goal,
    );
    return { ok: true, draft };
  } catch (error) {
    if (error instanceof AppError) return { ok: false, error: error.code, message: error.message };
    console.error("Plan generation failed", error);
    return { ok: false, error: "AI_UNAVAILABLE", message: "The plan could not be generated. Try again in a moment." };
  }
}
