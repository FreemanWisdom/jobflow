import "server-only";

import { JobPriority, JobStatus, Prisma } from "@prisma/client";
import { z } from "zod";

const dateInput = z.union([
  z.date(),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date in YYYY-MM-DD format."),
]);

const deadline = dateInput.nullable().optional().transform((value) => {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) throw new z.ZodError([]);
  return parsed;
});

const budget = z
  .union([z.string(), z.number()])
  .nullable()
  .optional()
  .transform((value, context) => {
    if (value === undefined || value === null || value === "") return null;
    const normalized = String(value).replace(/^\$/, "").replace(/,/g, "").trim();
    if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Budget must be a non-negative amount with up to two decimals." });
      return z.NEVER;
    }
    try {
      return new Prisma.Decimal(normalized).toFixed(2);
    } catch {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Budget must be a valid amount." });
      return z.NEVER;
    }
  });

const title = z.string().trim().min(1, "Title is required.").max(100);
const description = z.string().trim().max(1000).nullable().optional();
const client = z.string().trim().max(200).nullable().optional();
const status = z.nativeEnum(JobStatus);
const priority = z.nativeEnum(JobPriority);
const progress = z.number().int().min(0).max(100);

/**
 * Base field schemas without defaults, shared by create and update schemas.
 * Defaults are deliberately applied only on the create schema so that a
 * partial update never silently injects values the caller did not send.
 * Progress has no default anywhere: the data layer derives the initial
 * value (Completed => 100, otherwise 0) so the rule lives in one place.
 */
const baseFields = { title, description, client, status, priority, deadline, budget, progress };

export const createJobSchema = z.object({
  ...baseFields,
  status: status.default(JobStatus.PLANNING),
  priority: priority.default(JobPriority.MEDIUM),
  progress: progress.optional(),
}).strict();

export const updateJobSchema = z.object(baseFields).partial().strict().refine(
  (value) => Object.keys(value).length > 0,
  "At least one job field must be provided.",
);

export type CreateJobInput = z.input<typeof createJobSchema>;
export type UpdateJobInput = z.input<typeof updateJobSchema>;
export type ValidatedCreateJobInput = z.output<typeof createJobSchema>;
export type ValidatedUpdateJobInput = z.output<typeof updateJobSchema>;
