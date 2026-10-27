import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { ActivityType, JobPriority, JobStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createJob } from "@/lib/jobs/data-access";
import { createTasksBulkAction } from "@/lib/tasks/actions";
import { generatePlanAction } from "@/lib/planning/actions";
import { requireUser } from "@/lib/session";

vi.mock("@/lib/session", () => ({ requireUser: vi.fn() }));

/**
 * Integration tests for the AI task planner. They run against the PostgreSQL
 * database in DATABASE_URL (tests/setup.ts points it at jobflow_test). The
 * OpenAI API is always mocked via global fetch — no real provider is called
 * and no real API key is needed. Never point this suite at a database that
 * holds real data.
 */
const userA = randomUUID();
const userB = randomUUID();
const createdUserIds: string[] = [];
const realApiKey = process.env.OPENAI_API_KEY;

async function makeUser(id: string) {
  const user = await prisma.user.create({ data: { id, name: `Planner ${id.slice(0, 6)}`, email: `planner-${id}@jobflow.test`, passwordHash: "hashed" } });
  createdUserIds.push(user.id);
  return user;
}

async function makeJob(userId: string, title: string) {
  return createJob({ title, description: "A test job", status: JobStatus.IN_PROGRESS, priority: JobPriority.MEDIUM }, userId);
}

/** Build a fake OpenAI chat-completions body whose message content is `content`. */
function aiBody(content: unknown) {
  return { choices: [{ message: { content: typeof content === "string" ? content : JSON.stringify(content) } }] };
}

function stubFetch(payload: unknown, status = 200) {
  const fn = vi.fn(async () => ({ ok: status >= 200 && status < 300, status, json: async () => payload }) as unknown as Response);
  vi.stubGlobal("fetch", fn);
  return fn;
}

const validPlan = { tasks: [{ title: "Draft the launch brief", dueDate: "2026-12-15" }, { title: "Ship the announcement", dueDate: null }] };
const planIdPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{7,99}$/;

async function generatePlan(jobId: string, goal = "Plan the product launch") {
  const result = await generatePlanAction(jobId, goal);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("unreachable");
  return result.draft;
}

beforeAll(async () => {
  await makeUser(userA);
  await makeUser(userB);
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  await prisma.$disconnect();
});

beforeEach(() => {
  vi.mocked(requireUser).mockReset();
  vi.mocked(requireUser).mockResolvedValue({ id: userA });
  process.env.OPENAI_API_KEY = "test-key-for-mocked-fetch-only";
  delete process.env.OPENAI_TIMEOUT_MS;
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  if (realApiKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = realApiKey;
  vi.unstubAllGlobals();
});

describe("generatePlanAction — access control and input validation", () => {
  it("requires an authenticated user", async () => {
    const job = await makeJob(userA, "Auth check job");
    vi.mocked(requireUser).mockRejectedValue(new Error("UNAUTHENTICATED"));
    await expect(generatePlanAction(job.id, "Plan the launch")).rejects.toThrow("UNAUTHENTICATED");
  });

  it("does not generate plans for jobs owned by another user", async () => {
    const job = await makeJob(userB, "Someone else's job");
    const fetchMock = stubFetch(aiBody(validPlan));
    const result = await generatePlanAction(job.id, "Plan the launch");
    expect(result).toMatchObject({ ok: false, error: "NOT_FOUND" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects empty or too-short goals without calling the AI", async () => {
    const job = await makeJob(userA, "Empty goal job");
    const fetchMock = stubFetch(aiBody(validPlan));
    for (const goal of ["", "   ", "hi", null, undefined]) {
      const result = await generatePlanAction(job.id, goal as string);
      expect(result).toMatchObject({ ok: false, error: "INVALID_INPUT" });
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects oversized goals without calling the AI", async () => {
    const job = await makeJob(userA, "Long goal job");
    const fetchMock = stubFetch(aiBody(validPlan));
    const result = await generatePlanAction(job.id, "a".repeat(2001));
    expect(result).toMatchObject({ ok: false, error: "INVALID_INPUT" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("generatePlanAction — provider interaction", () => {
  it("returns a parsed draft with a plan id and writes nothing to the database", async () => {
    const job = await makeJob(userA, "Draft only job");
    const fetchMock = stubFetch(aiBody(validPlan));

    const draft = await generatePlan(job.id);

    expect(draft.planId).toMatch(planIdPattern);
    expect(draft.goal).toBe("Plan the product launch");
    expect(draft.tasks).toEqual([
      { title: "Draft the launch brief", dueDate: "2026-12-15" },
      { title: "Ship the announcement", dueDate: null },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // Nothing is persisted before approval.
    expect(await prisma.task.count({ where: { jobId: job.id } })).toBe(0);
    expect(await prisma.activity.count({ where: { jobId: job.id, type: ActivityType.TASK_CREATED } })).toBe(0);
  });

  it("reports a configuration error when the API key is missing, without calling the API", async () => {
    const job = await makeJob(userA, "Unconfigured job");
    delete process.env.OPENAI_API_KEY;
    const fetchMock = stubFetch(aiBody(validPlan));
    const result = await generatePlanAction(job.id, "Plan the launch");
    expect(result).toMatchObject({ ok: false, error: "AI_NOT_CONFIGURED" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await prisma.task.count({ where: { jobId: job.id } })).toBe(0);
  });

  it("rejects malformed AI output without writing anything", async () => {
    const job = await makeJob(userA, "Malformed output job");
    for (const content of ["certainly not json", JSON.stringify({ tasks: [] }), JSON.stringify({ foo: "bar" }), JSON.stringify({ tasks: [{ title: "Bad date", dueDate: "2026-02-30" }] })]) {
      stubFetch(aiBody(content));
      const result = await generatePlanAction(job.id, "Plan the launch");
      expect(result).toMatchObject({ ok: false, error: "AI_INVALID_PLAN" });
    }
    expect(await prisma.task.count({ where: { jobId: job.id } })).toBe(0);
    expect(await prisma.activity.count({ where: { jobId: job.id, type: ActivityType.TASK_CREATED } })).toBe(0);
  });

  it("maps provider failures to actionable errors without writing anything", async () => {
    const job = await makeJob(userA, "Provider failure job");
    stubFetch(aiBody(validPlan), 500);
    expect(await generatePlanAction(job.id, "Plan the launch")).toMatchObject({ ok: false, error: "AI_UNAVAILABLE" });

    stubFetch(aiBody(validPlan), 429);
    expect(await generatePlanAction(job.id, "Plan the launch")).toMatchObject({ ok: false, error: "AI_RATE_LIMITED" });

    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network down"); }));
    expect(await generatePlanAction(job.id, "Plan the launch")).toMatchObject({ ok: false, error: "AI_UNAVAILABLE" });

    expect(await prisma.task.count({ where: { jobId: job.id } })).toBe(0);
  });

  it("times out hanging provider requests", async () => {
    const job = await makeJob(userA, "Timeout job");
    process.env.OPENAI_TIMEOUT_MS = "50";
    vi.stubGlobal("fetch", vi.fn((_url: unknown, init?: { signal?: AbortSignal }) =>
      new Promise((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(new Error("aborted")))) as never));
    const result = await generatePlanAction(job.id, "Plan the launch");
    expect(result).toMatchObject({ ok: false, error: "AI_UNAVAILABLE" });
  });
});

describe("approval through the Phase A bulk creator", () => {
  it("creates the approved tasks and logs one bulk summary", async () => {
    const job = await makeJob(userA, "Approval job");
    stubFetch(aiBody(validPlan));
    const draft = await generatePlan(job.id);

    const created = await createTasksBulkAction(job.id, draft.planId, draft.tasks);

    expect(created.duplicate).toBe(false);
    expect(created.created).toHaveLength(2);
    expect(await prisma.task.count({ where: { jobId: job.id } })).toBe(2);
    const summaries = await prisma.activity.findMany({ where: { jobId: job.id, type: ActivityType.TASK_CREATED } });
    expect(summaries).toHaveLength(1);
    expect(summaries[0].message).toBe(`Bulk plan [plan:${draft.planId}]: created 2 tasks`);
  });

  it("is idempotent when the user approves the same plan twice", async () => {
    const job = await makeJob(userA, "Double approval job");
    stubFetch(aiBody(validPlan));
    const draft = await generatePlan(job.id);

    const first = await createTasksBulkAction(job.id, draft.planId, draft.tasks);
    const second = await createTasksBulkAction(job.id, draft.planId, draft.tasks);

    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(second.created).toHaveLength(0);
    expect(await prisma.task.count({ where: { jobId: job.id } })).toBe(2);
  });

  it("persists the user's edits, not the raw AI draft", async () => {
    const job = await makeJob(userA, "Editing job");
    stubFetch(aiBody(validPlan));
    const draft = await generatePlan(job.id);

    // The user edits the preview: renames the first task, clears its date,
    // drops the second task, and adds one of their own.
    const edited = [
      { title: "Draft the launch brief v2", dueDate: null },
      { title: "Schedule the demo call", dueDate: "2026-12-20" },
    ];

    const created = await createTasksBulkAction(job.id, draft.planId, edited);

    expect(created.created.map(task => task.title)).toEqual(["Draft the launch brief v2", "Schedule the demo call"]);
    const stored = await prisma.task.findMany({ where: { jobId: job.id }, orderBy: { title: "asc" } });
    expect(stored.map(task => task.title)).toEqual(["Draft the launch brief v2", "Schedule the demo call"]);
    expect(stored.every(task => task.dueDate === null || task.dueDate === null || task.dueDate?.toISOString().startsWith("2026-12-20"))).toBe(true);
  });

  it("still rejects invalid edited input at the data layer", async () => {
    const job = await makeJob(userA, "Invalid edit job");
    stubFetch(aiBody(validPlan));
    const draft = await generatePlan(job.id);

    await expect(createTasksBulkAction(job.id, draft.planId, [{ title: "Impossible date", dueDate: "2026-02-30" }])).rejects.toMatchObject({ code: "INVALID_INPUT" });
    await expect(createTasksBulkAction(job.id, draft.planId, [])).rejects.toMatchObject({ code: "INVALID_INPUT" });
    expect(await prisma.task.count({ where: { jobId: job.id } })).toBe(0);
  });
});
