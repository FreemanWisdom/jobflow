import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { JobPriority, JobStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  createJob,
  deleteJob,
  getDashboardStats,
  getJobById,
  getJobs,
  updateJob,
} from "@/lib/jobs/data-access";

/**
 * Integration tests. They run against the PostgreSQL database in
 * DATABASE_URL (tests/setup.ts points it at jobflow_test) and expect the
 * migrations to have been applied (`npm run db:deploy`). Never point this
 * suite at a database that holds real data.
 */
const userA = randomUUID();
const userB = randomUUID();
const createdUserIds: string[] = [];

async function makeUser(id: string) {
  const user = await prisma.user.create({ data: { id, name: `Test ${id.slice(0, 6)}`, email: `test-${id}@jobflow.test`, passwordHash: "hashed" } });
  createdUserIds.push(user.id);
  return user;
}

function formData(overrides: Record<string, unknown> = {}) {
  return {
    title: "Website Redesign",
    description: "Refresh the marketing site",
    client: "GreenTech",
    status: JobStatus.IN_PROGRESS,
    priority: JobPriority.HIGH,
    deadline: "2026-09-01",
    budget: "4800.00",
    ...overrides,
  };
}

beforeAll(async () => {
  await makeUser(userA);
  await makeUser(userB);
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  await prisma.$disconnect();
});

describe("job CRUD", () => {
  it("creates a job with an activity record and returns serialized data", async () => {
    const job = await createJob(formData(), userA);
    expect(job.id).toBeTruthy();
    expect(job.budget).toBe("4800.00");
    expect(job.progress).toBe(0);
    const activities = await prisma.activity.findMany({ where: { jobId: job.id } });
    expect(activities).toHaveLength(1);
    expect(activities[0].type).toBe("JOB_CREATED");
  });

  it("creates Completed jobs at 100% progress", async () => {
    const job = await createJob(formData({ status: JobStatus.COMPLETED }), userA);
    expect(job.progress).toBe(100);
  });

  it("preserves progress when editing unrelated fields (P0 regression)", async () => {
    const job = await createJob(formData(), userA);
    await prisma.job.update({ where: { id: job.id }, data: { progress: 68 } });
    const edited = await updateJob(job.id, { title: "Website Redesign v2", status: JobStatus.IN_PROGRESS, priority: JobPriority.HIGH, deadline: "2026-09-01", description: "Refresh the marketing site", client: "GreenTech", budget: "4800.00" }, userA);
    expect(edited.title).toBe("Website Redesign v2");
    expect(edited.progress).toBe(68);
  });

  it("records a single correctly-typed activity per update", async () => {
    const job = await createJob(formData(), userA);
    await updateJob(job.id, { title: "New Title Only" }, userA);
    await updateJob(job.id, { status: JobStatus.ON_HOLD }, userA);
    await updateJob(job.id, { priority: JobPriority.LOW }, userA);
    await updateJob(job.id, { deadline: "2026-10-15" }, userA);
    const activities = await prisma.activity.findMany({ where: { jobId: job.id }, orderBy: { createdAt: "asc" } });
    expect(activities.map(activity => activity.type)).toEqual([
      "JOB_CREATED",
      "JOB_UPDATED",
      "STATUS_CHANGED",
      "PRIORITY_CHANGED",
      "DUE_DATE_CHANGED",
    ]);
    expect(activities[2].message).toBe("Changed status from In Progress to On Hold");
  });

  it("records no activity when nothing changed", async () => {
    const job = await createJob(formData(), userA);
    const before = await prisma.activity.count({ where: { jobId: job.id } });
    await updateJob(job.id, { title: "Website Redesign" }, userA);
    const after = await prisma.activity.count({ where: { jobId: job.id } });
    expect(after).toBe(before);
  });

  it("applies the documented status/progress rule", async () => {
    const job = await createJob(formData(), userA);
    await prisma.job.update({ where: { id: job.id }, data: { progress: 40 } });
    const completed = await updateJob(job.id, { status: JobStatus.COMPLETED }, userA);
    expect(completed.progress).toBe(100);
    const reopened = await updateJob(job.id, { status: JobStatus.PLANNING }, userA);
    expect(reopened.progress).toBe(0);
  });

  it("rejects empty updates and invalid input", async () => {
    const job = await createJob(formData(), userA);
    await expect(updateJob(job.id, {}, userA)).rejects.toMatchObject({ code: "INVALID_INPUT" });
    await expect(updateJob(job.id, { progress: 150 }, userA)).rejects.toMatchObject({ code: "INVALID_INPUT" });
    await expect(createJob({ title: "   " }, userA)).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });
});

describe("ownership and isolation", () => {
  it("never returns another user's job by id", async () => {
    const job = await createJob(formData(), userA);
    expect(await getJobById(job.id, userB)).toBeNull();
    expect(await getJobById("does-not-exist", userA)).toBeNull();
  });

  it("refuses to update or delete another user's job", async () => {
    const job = await createJob(formData(), userA);
    await expect(updateJob(job.id, { title: "Hijacked" }, userB)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect((await getJobById(job.id, userA))?.title).toBe("Website Redesign");
    await expect(deleteJob(job.id, userB)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await getJobById(job.id, userA)).not.toBeNull();
    await expect(updateJob("does-not-exist", { title: "x" }, userA)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("scopes job listings to the requesting user", async () => {
    const marker = randomUUID();
    const jobA = await createJob(formData({ title: `Scope A ${marker}` }), userA);
    const jobB = await createJob(formData({ title: `Scope B ${marker}` }), userB);
    const jobsA = (await getJobs({ userId: userA })).filter(job => job.title.endsWith(marker));
    const jobsB = (await getJobs({ userId: userB })).filter(job => job.title.endsWith(marker));
    expect(jobsA.map(job => job.id)).toEqual([jobA.id]);
    expect(jobsB.map(job => job.id)).toEqual([jobB.id]);
  });

  it("throws for a missing session user", async () => {
    await expect(getJobs({ userId: "" })).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });
});

describe("dashboard statistics scoping", () => {
  it("counts only the requesting user's jobs with the documented definitions", async () => {
    const statsUser = await makeUser(randomUUID());
    const otherUser = await makeUser(randomUUID());
    const now = new Date();
    await prisma.job.create({ data: { userId: statsUser.id, title: "Overdue job", status: JobStatus.IN_PROGRESS, priority: JobPriority.LOW, deadline: new Date(now.getTime() - 86_400_000), progress: 10 } });
    await prisma.job.create({ data: { userId: statsUser.id, title: "Completed job", status: JobStatus.COMPLETED, priority: JobPriority.LOW, progress: 100 } });
    // Another user's jobs must never influence the dashboard counts.
    await prisma.job.create({ data: { userId: otherUser.id, title: "Other user job", status: JobStatus.PLANNING, priority: JobPriority.LOW, progress: 0 } });
    const stats = await getDashboardStats(statsUser.id);
    const direct = await prisma.job.count({ where: { userId: statsUser.id } });
    expect(stats.totalJobs).toBe(2);
    expect(stats.totalJobs).toBe(direct);
    expect(stats.completedJobs).toBe(1);
    expect(stats.overdueJobs).toBe(1);
    expect(stats.activeJobs).toBe(1);
    expect(stats.recentJobs).toHaveLength(2);
  });
});
