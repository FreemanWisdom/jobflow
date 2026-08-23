export const jobStatuses = ["Planning", "In Progress", "On Hold", "Completed", "Cancelled"] as const;
export const jobPriorities = ["Low", "Medium", "High", "Urgent"] as const;
export const sortOptions = ["Newest", "Oldest", "Deadline soonest", "Deadline latest"] as const;

export type JobStatus = (typeof jobStatuses)[number];
export type JobPriority = (typeof jobPriorities)[number];
export type SortOption = (typeof sortOptions)[number];
export type Job = { id: string; title: string; description: string; client: string; status: JobStatus; priority: JobPriority; deadline: string; budget: string; progress: number; createdAt: string; updatedAt: string };
export type JobFormData = Omit<Job, "id" | "progress" | "createdAt" | "updatedAt">;

export const initialJobs: Job[] = [
  { id: "website-redesign", title: "Website Redesign", description: "Refresh the GreenTech marketing website with a clearer structure and a stronger conversion path.", client: "GreenTech Ltd", status: "In Progress", priority: "High", deadline: "2026-08-28", budget: "$4,800", progress: 70, createdAt: "2026-08-03", updatedAt: "2026-08-21" },
  { id: "mobile-app-ui", title: "Mobile App UI", description: "Design a lightweight visual system and core mobile flows for Nova's customer application.", client: "Nova Labs", status: "In Progress", priority: "Medium", deadline: "2026-09-04", budget: "$3,200", progress: 50, createdAt: "2026-08-07", updatedAt: "2026-08-20" },
  { id: "portfolio-website", title: "Portfolio Website", description: "Build a focused personal portfolio to showcase recent product and brand work.", client: "Personal", status: "Planning", priority: "Low", deadline: "2026-09-12", budget: "", progress: 20, createdAt: "2026-08-10", updatedAt: "2026-08-18" },
  { id: "launch-campaign", title: "Autumn Launch Campaign", description: "Prepare campaign landing pages, email assets, and launch content for the seasonal release.", client: "Northstar Co.", status: "On Hold", priority: "Urgent", deadline: "2026-08-26", budget: "$6,500", progress: 35, createdAt: "2026-07-28", updatedAt: "2026-08-16" },
  { id: "brand-audit", title: "Brand Audit", description: "Completed review of the current positioning, visuals, and competitive landscape.", client: "Field Notes", status: "Completed", priority: "Medium", deadline: "2026-08-15", budget: "$1,800", progress: 100, createdAt: "2026-07-15", updatedAt: "2026-08-15" },
  { id: "event-site", title: "Conference Event Site", description: "A postponed event website project awaiting client confirmation.", client: "Summit Works", status: "Cancelled", priority: "Low", deadline: "2026-09-20", budget: "$2,400", progress: 10, createdAt: "2026-07-12", updatedAt: "2026-08-11" },
];
