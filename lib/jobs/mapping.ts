import { ActivityType, JobPriority, JobStatus } from "@prisma/client";
import type { JobFormData, JobPriority as UiJobPriority, JobStatus as UiJobStatus } from "@/app/components/job-data";

export const statusMap: Record<UiJobStatus, JobStatus> = {
  Planning: JobStatus.PLANNING,
  "In Progress": JobStatus.IN_PROGRESS,
  "On Hold": JobStatus.ON_HOLD,
  Completed: JobStatus.COMPLETED,
  Cancelled: JobStatus.CANCELLED,
};

export const priorityMap: Record<UiJobPriority, JobPriority> = {
  Low: JobPriority.LOW,
  Medium: JobPriority.MEDIUM,
  High: JobPriority.HIGH,
  Urgent: JobPriority.URGENT,
};

export const statusLabels: Record<JobStatus, UiJobStatus> = {
  PLANNING: "Planning",
  IN_PROGRESS: "In Progress",
  ON_HOLD: "On Hold",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const priorityLabels: Record<JobPriority, UiJobPriority> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export function statusLabel(status: JobStatus): UiJobStatus {
  return statusLabels[status];
}

export function priorityLabel(priority: JobPriority): UiJobPriority {
  return priorityLabels[priority];
}

/**
 * Input for creating a job from the UI form.
 *
 * Progress rule (documented): a newly created job starts at 0% unless it is
 * created directly as Completed, in which case it starts at 100%.
 */
export function toCreateJobInput(data: JobFormData) {
  return {
    title: data.title,
    description: data.description || null,
    client: data.client || null,
    status: statusMap[data.status],
    priority: priorityMap[data.priority],
    deadline: data.deadline || null,
    budget: data.budget || null,
    progress: data.status === "Completed" ? 100 : 0,
  };
}

/**
 * Input for updating a job from the UI edit form.
 *
 * Progress is intentionally omitted: the data layer derives progress from the
 * status transition (see applyStatusProgressRule), so an ordinary edit never
 * silently resets a job's progress.
 */
export function toUpdateJobInput(data: JobFormData) {
  return {
    title: data.title,
    description: data.description || null,
    client: data.client || null,
    status: statusMap[data.status],
    priority: priorityMap[data.priority],
    deadline: data.deadline || null,
    budget: data.budget || null,
  };
}

/**
 * Status/progress rule (documented):
 * - Moving a job to Completed always sets progress to 100%.
 * - Moving a job away from Completed resets progress to 0% (a 100% "In Progress"
 *   job would be misleading).
 * - All other transitions and edits preserve the existing progress.
 *
 * `patch` is mutated in place and returned.
 */
export function applyStatusProgressRule<T extends { status?: JobStatus; progress?: number }>(
  patch: T,
  existingStatus: JobStatus,
): T & { progress?: number } {
  const next = patch as T & { progress?: number };
  if (next.status === JobStatus.COMPLETED && next.progress === undefined) {
    next.progress = 100;
  } else if (
    existingStatus === JobStatus.COMPLETED &&
    next.status !== undefined &&
    next.status !== JobStatus.COMPLETED &&
    next.progress === undefined
  ) {
    next.progress = 0;
  }
  return next;
}

/** Serialized job shape used for pure comparison logic. */
export type ComparableJob = {
  title: string;
  description: string | null;
  client: string | null;
  status: JobStatus;
  priority: JobPriority;
  deadline: string;
  budget: string | null;
};

/** True when both dates are absent, or both present and equal (date precision). */
export function datesEqual(a: string | null, b: string | null): boolean {
  return (a ?? "") === (b ?? "");
}

/**
 * Activity classification for a job update.
 *
 * Policy (documented): at most one activity entry per update, classified by
 * precedence STATUS_CHANGED > PRIORITY_CHANGED > DUE_DATE_CHANGED >
 * JOB_UPDATED. When nothing actually changed, no activity entry is recorded.
 */
export function chooseUpdateActivityType(
  before: ComparableJob,
  after: ComparableJob,
): ActivityType | null {
  if (before.status !== after.status) return ActivityType.STATUS_CHANGED;
  if (before.priority !== after.priority) return ActivityType.PRIORITY_CHANGED;
  if (!datesEqual(before.deadline, after.deadline)) return ActivityType.DUE_DATE_CHANGED;
  if (
    before.title !== after.title ||
    before.description !== after.description ||
    before.client !== after.client ||
    (before.budget ?? "") !== (after.budget ?? "")
  ) {
    return ActivityType.JOB_UPDATED;
  }
  return null;
}

/**
 * Human-readable activity message for a job update, matching the recorded type.
 */
export function buildUpdateActivityMessage(
  type: ActivityType,
  before: ComparableJob,
  after: ComparableJob,
): string {
  switch (type) {
    case ActivityType.STATUS_CHANGED:
      return `Changed status from ${statusLabel(before.status)} to ${statusLabel(after.status)}`;
    case ActivityType.PRIORITY_CHANGED:
      return `Changed priority from ${priorityLabel(before.priority)} to ${priorityLabel(after.priority)}`;
    case ActivityType.DUE_DATE_CHANGED:
      return after.deadline ? `Changed due date to ${after.deadline}` : "Removed the due date";
    default:
      return `Updated job “${after.title}”`;
  }
}
