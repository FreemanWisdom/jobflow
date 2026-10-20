export const jobStatuses = ["Planning", "In Progress", "On Hold", "Completed", "Cancelled"] as const;
export const jobPriorities = ["Low", "Medium", "High", "Urgent"] as const;
export const sortOptions = ["Newest", "Oldest", "Deadline soonest", "Deadline latest"] as const;

export type JobStatus = (typeof jobStatuses)[number];
export type JobPriority = (typeof jobPriorities)[number];
export type SortOption = (typeof sortOptions)[number];
export type Job = { id: string; title: string; description: string; client: string; status: JobStatus; priority: JobPriority; deadline: string; budget: string; progress: number; createdAt: string; updatedAt: string };
export type JobFormData = Omit<Job, "id" | "progress" | "createdAt" | "updatedAt">;
