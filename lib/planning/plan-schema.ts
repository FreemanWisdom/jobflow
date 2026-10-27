import { z } from "zod";
import { MAX_BULK_TASKS } from "@/lib/tasks/data-access";
import { parseStrictDueDate } from "@/lib/tasks/data-access";
import { AppError } from "@/lib/errors";

/**
 * Schema for the JSON payload an AI provider is asked to return for a task
 * plan. AI output is untrusted input: every field is validated, unknown
 * fields are rejected, and due dates must be real calendar dates in strict
 * YYYY-MM-DD form (the same rule the Phase A bulk creator enforces on write).
 */
const planTaskSchema = z
  .object({
    title: z.string().trim().min(1, "Task titles must not be empty.").max(200, "Task titles must be 200 characters or fewer."),
    dueDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Due dates must use the YYYY-MM-DD format.")
      .nullish()
      .superRefine((value, context) => {
        if (value == null) return;
        try {
          parseStrictDueDate(value);
        } catch {
          context.addIssue({ code: z.ZodIssueCode.custom, message: "Due dates must be real calendar dates." });
        }
      }),
  })
  .strict();

const planSchema = z
  .object({
    tasks: z.array(planTaskSchema).min(1, "A plan must contain at least one task.").max(MAX_BULK_TASKS, `A plan may contain at most ${MAX_BULK_TASKS} tasks.`),
  })
  .strict();

export type PlanTask = { title: string; dueDate: string | null };

/**
 * Validate raw AI output (a JSON string or an already-parsed value) into a
 * list of plan tasks. Throws AppError("AI_INVALID_PLAN") for anything that is
 * not an exact match for the plan schema; nothing is persisted anywhere.
 */
export function parsePlanResponse(raw: unknown): PlanTask[] {
  let candidate: unknown = raw;
  if (typeof candidate === "string") {
    try {
      candidate = JSON.parse(candidate);
    } catch {
      throw new AppError("AI_INVALID_PLAN", "The AI returned a plan that could not be read. Try generating again.");
    }
  }
  const result = planSchema.safeParse(candidate);
  if (!result.success) {
    throw new AppError("AI_INVALID_PLAN", "The AI returned an invalid plan. Try generating again.");
  }
  return result.data.tasks.map(task => ({ title: task.title, dueDate: task.dueDate ?? null }));
}
