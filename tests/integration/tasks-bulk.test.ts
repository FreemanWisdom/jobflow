import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { ActivityType, JobPriority, JobStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createJob } from "@/lib/jobs/data-access";
import { createTasksBulk, MAX_BULK_TASKS } from "@/lib/tasks/data-access";
import { AppError } from "@/lib/errors";

/**
 * Integration tests for the bulk task-creation foundation. They run against
 * the PostgreSQL database in DATABASE_URL (tests/setup.ts points it at
 * jobflow_test) and expect the migrations to have been applied. Never point
 * this suite at a database that holds real data.
 */
const userA = randomUUID();
const userB = randomUUID();
const createdUserIds: string[] = [];

async function makeUser(id: string) {
  const user = await prisma.user.create({ data: { id, name: `Bulk ${id.slice(0, 6)}`, email: `bulk-${id}@jobflow.test`, passwordHash: "hashed" } });
  createdUserIds.push(user.id);
  return user;
}

async function makeJob(userId: string, title: string) {
  return createJob({ title, status: JobStatus.IN_PROGRESS, priority: JobPriority.MEDIUM }, userId);
}

function planId() {
  return randomUUID();
}

function taskInput(overrides: Record<string, unknown> = {}) {
  return { title: "Draft the brief", dueDate: "2026-11-05", ...overrides } as { title: string; dueDate: string | null };
}

beforeAll(async () => {
  await makeUser(userA);
  await makeUser(userB);
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  await prisma.$disconnect();
});

describe("createTasksBulk", () => {
  it("creates every task in one call and returns the created records", async () => {
    const job = await makeJob(userA, "Landing page build");
    const plan = planId();
    const result = await createTasksBulk(job.id, userA, plan, [
      taskInput(),
      taskInput({ title: "Design mockups", dueDate: null }),
      taskInput({ title: "Ship to production", dueDate: "2026-12-01" }),
    ]);

    expect(result.duplicate).toBe(false);
    expect(result.created).toHaveLength(3);
    expect(result.created.map(t => t.title)).toEqual(["Draft the brief", "Design mockups", "Ship to production"]);
    expect(result.created[0].dueDate?.toISOString()).toBe("2026-11-05T00:00:00.000Z");
    expect(result.created[1].dueDate).toBeNull();

    const stored = await prisma.task.findMany({ where: { jobId: job.id } });
    expect(stored).toHaveLength(3);
  });

  it("logs exactly one TASK_CREATED summary activity carrying the plan marker", async () => {
    const job = await makeJob(userA, "Website redesign");
    const plan = planId();
    await createTasksBulk(job.id, userA, plan, [taskInput(), taskInput({ title: "Second step" })]);

    const activities = await prisma.activity.findMany({ where: { jobId: job.id }, orderBy: { createdAt: "asc" } });
    // The job creation activity plus the single bulk summary.
    expect(activities).toHaveLength(2);
    const summary = activities.find(a => a.type === ActivityType.TASK_CREATED);
    expect(summary).toBeTruthy();
    expect(summary?.message).toContain(`[plan:${plan}]`);
    expect(summary?.message).toContain("2");
  });

  it("rejects jobs owned by another user without creating anything", async () => {
    const job = await makeJob(userA, "Private job");
    await expect(createTasksBulk(job.id, userB, planId(), [taskInput()])).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await prisma.task.findMany({ where: { jobId: job.id } })).toHaveLength(0);
  });

  it("rejects a missing job without creating anything", async () => {
    await expect(createTasksBulk("does-not-exist", userA, planId(), [taskInput()])).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("validates the whole batch before writing: one bad item, zero tasks created", async () => {
    const job = await makeJob(userA, "All-or-nothing");
    const before = await prisma.task.count({ where: { jobId: job.id } });

    await expect(
      createTasksBulk(job.id, userA, planId(), [
        taskInput({ title: "Valid first" }),
        taskInput({ title: "   " }),
        taskInput({ title: "Valid last" }),
      ]),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
    expect(await prisma.task.count({ where: { jobId: job.id } })).toBe(before);
  });

  it("rejects invalid task input", async () => {
    const job = await makeJob(userA, "Validation job");
    const cases: { plan: string; tasks: { title: unknown; dueDate: unknown }[] }[] = [
      { plan: planId(), tasks: [] },
      { plan: planId(), tasks: [{ title: "x".repeat(201), dueDate: null }] },
      { plan: planId(), tasks: [{ title: "Bad date", dueDate: "31/12/2026" }] },
      { plan: planId(), tasks: Array.from({ length: MAX_BULK_TASKS + 1 }, (_, i) => ({ title: `Task ${i}`, dueDate: null })) },
    ];
    for (const { plan, tasks } of cases) {
      await expect(createTasksBulk(job.id, userA, plan, tasks as never)).rejects.toMatchObject({ code: "INVALID_INPUT" });
    }
    expect(await prisma.task.findMany({ where: { jobId: job.id } })).toHaveLength(0);
  });

  it("rejects malformed plan ids", async () => {
    const job = await makeJob(userA, "Plan id job");
    for (const bad of ["", "short", "has space in it", "no!symbols", `${"x".repeat(101)}`]) {
      await expect(createTasksBulk(job.id, userA, bad, [taskInput()])).rejects.toBeInstanceOf(AppError);
    }
    expect(await prisma.task.findMany({ where: { jobId: job.id } })).toHaveLength(0);
  });

  it("is idempotent for a retried plan: second call reports duplicate and writes nothing", async () => {
    const job = await makeJob(userA, "Retry-safe job");
    const plan = planId();
    const first = await createTasksBulk(job.id, userA, plan, [taskInput(), taskInput({ title: "Retry second" })]);
    const second = await createTasksBulk(job.id, userA, plan, [taskInput(), taskInput({ title: "Retry second" })]);

    expect(second.duplicate).toBe(true);
    expect(second.created).toHaveLength(0);
    expect(await prisma.task.count({ where: { jobId: job.id } })).toBe(first.created.length);
    const summaries = await prisma.activity.findMany({ where: { jobId: job.id, type: ActivityType.TASK_CREATED } });
    expect(summaries).toHaveLength(1);
  });

  it("does not treat similar plan ids as duplicates (marker boundary safety)", async () => {
    const job = await makeJob(userA, "Marker boundary job");
    const base = "plan-12345";
    const first = await createTasksBulk(job.id, userA, base, [taskInput({ title: "From base plan" })]);
    const extended = await createTasksBulk(job.id, userA, `${base}6`, [taskInput({ title: "From extended plan" })]);

    expect(first.duplicate).toBe(false);
    expect(extended.duplicate).toBe(false);
    expect(await prisma.task.count({ where: { jobId: job.id } })).toBe(2);
  });

  it("rejects impossible calendar dates that JavaScript would silently normalize", async () => {
    const job = await makeJob(userA, "Calendar edge cases");
    const impossible = [
      "2026-02-30", // February 30 normalizes to March 2
      "2026-02-29", // 2026 is not a leap year
      "2026-04-31", // April has 30 days
      "2026-06-31",
      "2026-11-31",
      "2026-13-01", // month 13 normalizes to January 2027
      "2026-00-10", // month 0 normalizes to December 2025
      "2026-01-00", // day 0 normalizes to December 31
      "2026-1-05",  // not strict YYYY-MM-DD
      "26-02-28",
    ];
    for (const dueDate of impossible) {
      const result = createTasksBulk(job.id, userA, planId(), [{ title: "Impossible date task", dueDate }]);
      await expect(result).rejects.toMatchObject({ code: "INVALID_INPUT" });
    }
    expect(await prisma.task.findMany({ where: { jobId: job.id } })).toHaveLength(0);
  });

  it("accepts real calendar dates including leap days", async () => {
    const job = await makeJob(userA, "Leap day job");
    const result = await createTasksBulk(job.id, userA, planId(), [
      taskInput({ dueDate: "2028-02-29" }), // 2028 is a leap year
      taskInput({ dueDate: "2026-02-28" }),
    ]);
    expect(result.duplicate).toBe(false);
    expect(result.created[0].dueDate?.toISOString()).toBe("2028-02-29T00:00:00.000Z");
    expect(result.created[1].dueDate?.toISOString()).toBe("2026-02-28T00:00:00.000Z");
  });

  it("matches plan markers literally when ids contain underscores or look-alike characters", async () => {
    const job = await makeJob(userA, "Marker literalness job");
    // Hyphenated id created first: an unescaped LIKE-style lookup for the
    // underscore id below would match its message ('_' matches any char),
    // falsely reporting a duplicate for an id that was never created.
    const hyphenId = "marker-test-plan-2026-01";
    const underscoreId = "marker_test_plan_2026_01";
    const similarUnderscoreId = "marker_test_plan_2026_10";

    const hyphen = await createTasksBulk(job.id, userA, hyphenId, [taskInput({ title: "From hyphen id" })]);
    const underscore = await createTasksBulk(job.id, userA, underscoreId, [taskInput({ title: "From underscore id" })]);
    const similar = await createTasksBulk(job.id, userA, similarUnderscoreId, [taskInput({ title: "From similar id" })]);

    expect(hyphen.duplicate).toBe(false);
    expect(underscore.duplicate).toBe(false); // must not cross-match the hyphen id
    expect(similar.duplicate).toBe(false);

    // Retrying each id is detected, and each retry only matches its own marker.
    expect((await createTasksBulk(job.id, userA, hyphenId, [taskInput({ title: "Retry hyphen" })])).duplicate).toBe(true);
    expect((await createTasksBulk(job.id, userA, underscoreId, [taskInput({ title: "Retry underscore" })])).duplicate).toBe(true);
    expect((await createTasksBulk(job.id, userA, similarUnderscoreId, [taskInput({ title: "Retry similar" })])).duplicate).toBe(true);
    expect(await prisma.task.count({ where: { jobId: job.id } })).toBe(3);
    expect(await prisma.activity.count({ where: { jobId: job.id, type: ActivityType.TASK_CREATED } })).toBe(3);
  });

  it("serializes concurrent retries of the same plan so only one batch lands", async () => {
    const job = await makeJob(userA, "Concurrency job");
    const plan = planId();
    const batch = [taskInput(), taskInput({ title: "Concurrent second" })];

    const [a, b] = await Promise.all([
      createTasksBulk(job.id, userA, plan, batch),
      createTasksBulk(job.id, userA, plan, batch),
    ]);

    const created = [a, b].filter(r => r.duplicate === false);
    expect(created).toHaveLength(1);
    expect(await prisma.task.count({ where: { jobId: job.id } })).toBe(batch.length);
    expect(await prisma.activity.count({ where: { jobId: job.id, type: ActivityType.TASK_CREATED } })).toBe(1);
  });
});
