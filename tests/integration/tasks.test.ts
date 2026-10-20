import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { JobPriority, JobStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createJob } from "@/lib/jobs/data-access";
import {
  createTask,
  getAllUserTasks,
  getDashboardActivities,
  getJobActivities,
  getJobTasks,
  removeTask,
  toggleTask,
} from "@/lib/tasks/data-access";
import { exportDataAction } from "@/lib/account-actions";
import { requireUser } from "@/lib/session";

vi.mock("@/lib/session", () => ({ requireUser: vi.fn() }));

beforeEach(() => {
  vi.mocked(requireUser).mockReset();
});

/** Integration tests against the jobflow_test database (see jobs.test.ts). */
const userA = randomUUID();
const userB = randomUUID();
const createdUserIds: string[] = [];

async function makeUser(id: string) {
  const user = await prisma.user.create({ data: { id, name: `Task ${id.slice(0, 6)}`, email: `task-${id}@jobflow.test`, passwordHash: "hashed" } });
  createdUserIds.push(user.id);
  return user;
}

async function makeJob(userId: string, title: string) {
  return createJob({ title, status: JobStatus.IN_PROGRESS, priority: JobPriority.MEDIUM }, userId);
}

beforeAll(async () => {
  await makeUser(userA);
  await makeUser(userB);
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  await prisma.$disconnect();
});

describe("task lifecycle", () => {
  it("creates, completes, reopens and deletes tasks with activity records", async () => {
    const job = await makeJob(userA, "Task lifecycle job");
    const task = await createTask(job.id, userA, "Write copy", "2026-09-05");
    expect(task.title).toBe("Write copy");
    expect(task.dueDate?.toISOString().slice(0, 10)).toBe("2026-09-05");

    const completed = await toggleTask(task.id, userA, true);
    expect(completed.completed).toBe(true);
    const activity = await prisma.activity.findFirst({ where: { jobId: job.id, type: "TASK_COMPLETED" } });
    expect(activity?.message).toContain("Write copy");

    const reopened = await toggleTask(task.id, userA, false);
    expect(reopened.completed).toBe(false);
    expect(await prisma.activity.count({ where: { jobId: job.id, type: "TASK_REOPENED" } })).toBe(1);

    await removeTask(task.id, userA);
    expect(await prisma.task.count({ where: { id: task.id } })).toBe(0);
    expect(await prisma.activity.count({ where: { jobId: job.id, type: "TASK_DELETED" } })).toBe(1);
  });

  it("scopes task reads through the owning job", async () => {
    const jobA = await makeJob(userA, "A scoped job");
    const taskA = await createTask(jobA.id, userA, "A task", null);
    const jobB = await makeJob(userB, "B scoped job");
    const taskB = await createTask(jobB.id, userB, "B task", null);

    await expect(getJobTasks(jobA.id, userB)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await getJobTasks(jobA.id, userA)).toHaveLength(1);
    expect((await getAllUserTasks(userA)).every(task => task.id === taskA.id || task.job.title.includes("A"))).toBe(true);

    // Toggling another user's task must not work.
    await expect(toggleTask(taskB.id, userA, true)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(toggleTask(taskB.id, userB, true)).resolves.toMatchObject({ completed: true });
    await expect(removeTask(taskA.id, userB)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await prisma.task.count({ where: { id: taskA.id } })).toBe(1);
  });

  it("validates task input", async () => {
    const job = await makeJob(userA, "Validation job");
    await expect(createTask(job.id, userA, "", null)).rejects.toMatchObject({ code: "INVALID_INPUT" });
    await expect(createTask(job.id, userA, "x".repeat(201), null)).rejects.toMatchObject({ code: "INVALID_INPUT" });
    await expect(createTask("missing", userA, "Task", null)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("activity history", () => {
  it("returns activity scoped to the owning user and supports larger limits", async () => {
    const job = await makeJob(userA, "Activity job");
    for (let index = 0; index < 12; index += 1) {
      await createTask(job.id, userA, `Task ${index}`, null);
    }
    const defaultView = await getDashboardActivities(userA);
    const fullView = await getDashboardActivities(userA, 20);
    expect(defaultView).toHaveLength(8);
    expect(fullView.length).toBeGreaterThanOrEqual(13);
    const foreign = await getDashboardActivities(userB, 20);
    expect(foreign.every(entry => entry.jobId !== job.id)).toBe(true);
    await expect(getJobActivities(job.id, userB)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect((await getJobActivities(job.id, userA)).length).toBeGreaterThan(0);
  });
});

describe("data export", () => {
  it("exports only the signed-in user's data with JSON-safe values", async () => {
    const jobA = await createJob({ title: "Export job A", status: JobStatus.IN_PROGRESS, priority: JobPriority.MEDIUM, budget: "4800.00" }, userA);
    await createTask(jobA.id, userA, "Export task", null);
    const jobB = await makeJob(userB, "Export job B");

    // Mock the session so exportDataAction runs as user A.
    vi.mocked(requireUser).mockResolvedValue({ id: userA, email: `task-${userA}@jobflow.test` });
    const data = await exportDataAction();

    expect(data.version).toBe(1);
    expect(data.jobs.map(job => job.title)).toContain("Export job A");
    expect(data.jobs.map(job => job.title)).not.toContain("Export job B");
    expect(data.jobs.map(job => job.id)).not.toContain(jobB.id);
    expect(data.tasks.map(task => task.title)).toContain("Export task");

    // Prisma Decimal and Date values must be JSON-safe.
    const json = JSON.parse(JSON.stringify(data));
    const exported = json.jobs.find((job: { title: string }) => job.title === "Export job A");
    expect(typeof exported.budget).toBe("string");
    expect(exported.budget).toBe("4800.00");
    expect(typeof json.jobs[0].createdAt).toBe("string");
    expect(typeof json.exportedAt).toBe("string");
    expect(json.user.email).toBe(`task-${userA}@jobflow.test`);
  });
});
