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

const commonFields = {
  title: z.string().trim().min(1, "Title is required.").max(100),
  description: z.string().trim().max(1000).nullable().optional(),
  client: z.string().trim().max(200).nullable().optional(),
  status: z.nativeEnum(JobStatus).default(JobStatus.PLANNING),
  priority: z.nativeEnum(JobPriority).default(JobPriority.MEDIUM),
  deadline,
  budget,
  progress: z.number().int().min(0).max(100).default(0),
};

export const createJobSchema = z.object(commonFields).strict();
export const updateJobSchema = createJobSchema.partial().strict().refine(
  (value) => Object.keys(value).length > 0,
  "At least one job field must be provided.",
);

export type CreateJobInput = z.input<typeof createJobSchema>;
export type UpdateJobInput = z.input<typeof updateJobSchema>;
export type ValidatedCreateJobInput = z.output<typeof createJobSchema>;
export type ValidatedUpdateJobInput = z.output<typeof updateJobSchema>;
