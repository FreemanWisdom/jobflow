import "server-only";

import { randomUUID } from "node:crypto";
import { AppError } from "@/lib/errors";
import { parsePlanResponse, type PlanTask } from "./plan-schema";

/**
 * Server-side AI plan generation. Talks to the OpenAI chat completions API
 * and returns a draft only — nothing here reads or writes the database.
 * The draft is shown to the user for editing and is only persisted after
 * explicit approval, through the Phase A bulk-creation action.
 *
 * Configuration (all read server-side; the key is never sent to the client):
 * - OPENAI_API_KEY     — required; when missing the planner reports a
 *                        configuration error instead of crashing.
 * - OPENAI_MODEL       — optional; defaults to a small, cheap model.
 * - OPENAI_TIMEOUT_MS  — optional; request timeout, default 30 seconds.
 */

const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_GOAL_CHARS = 2_000;
const MAX_COMPLETION_TOKENS = 900;

export type PlanDraft = { planId: string; goal: string; tasks: PlanTask[] };

export type PlanJobContext = {
  title: string;
  description: string | null;
  client: string | null;
  deadline: string | null;
  status: string;
};

const SYSTEM_PROMPT = [
  "You are a task planner for a freelance work-tracking app.",
  "Given a job's context and a goal, propose a short, focused list of tasks.",
  "Respond with JSON only, exactly in this shape:",
  '{"tasks":[{"title":"short task title","dueDate":"YYYY-MM-DD"}]}',
  "Rules:",
  "- 1 to 15 tasks, ordered in the sequence they should be done.",
  "- Titles are plain text, at most 200 characters, no numbering, no markdown.",
  "- dueDate is a real calendar date in strict YYYY-MM-DD form, or null when no date makes sense.",
  "- Only propose tasks; never mark anything complete and never invent progress, budgets or external integrations.",
].join("\n");

function buildUserPrompt(job: PlanJobContext, goal: string) {
  const today = new Date().toISOString().slice(0, 10);
  return [
    `Today is ${today}.`,
    `Job title: ${job.title}`,
    `Job description: ${job.description ?? "(none)"}`,
    `Client: ${job.client ?? "(none)"}`,
    `Job deadline: ${job.deadline ?? "(none)"}`,
    `Job status: ${job.status}`,
    "",
    `Goal: ${goal}`,
  ].join("\n");
}

async function callOpenAI(job: PlanJobContext, goal: string): Promise<PlanTask[]> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new AppError("AI_NOT_CONFIGURED", "The AI planner is not configured. Add an OPENAI_API_KEY environment variable and redeploy.");

  const model = process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;
  const timeoutMs = Number(process.env.OPENAI_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let content: unknown;
  // The timeout stays armed through the fetch AND the body read: a provider
  // that streams headers and then stalls would otherwise leave response.json()
  // hanging long past the timeout.
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: MAX_COMPLETION_TOKENS,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(job, goal) },
        ],
      }),
    });

    if (response.status === 429) throw new AppError("AI_RATE_LIMITED", "The AI planner is busy right now. Wait a moment and try again.");
    if (!response.ok) {
      console.error("AI planner request failed with status", response.status);
      throw new AppError("AI_UNAVAILABLE", "The AI planner could not generate a plan. Try again in a moment.");
    }

    try {
      const payload = await response.json();
      content = (payload as { choices?: { message?: { content?: unknown } }[] })?.choices?.[0]?.message?.content;
    } catch (error) {
      // Distinguish "the provider stalled and was aborted" from "unreadable body".
      if (controller.signal.aborted) throw new AppError("AI_UNAVAILABLE", "The AI planner took too long to respond. Try again in a moment.");
      throw new AppError("AI_INVALID_PLAN", "The AI returned an unreadable plan. Try generating again.");
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("AI_UNAVAILABLE", "The AI planner could not be reached. Try again in a moment.");
  } finally {
    clearTimeout(timeout);
  }

  if (typeof content !== "string") throw new AppError("AI_INVALID_PLAN", "The AI returned an unreadable plan. Try generating again.");
  return parsePlanResponse(content);
}

/**
 * Generate a task-plan draft for a job. `planId` is generated here and ties
 * the draft to the Phase A duplicate-protection marker: approving the same
 * draft twice is a no-op, not a double write.
 */
export async function generateTaskPlan(job: PlanJobContext, goal: string): Promise<PlanDraft> {
  const cleanGoal = typeof goal === "string" ? goal.trim() : "";
  if (cleanGoal.length < 3) throw new AppError("INVALID_INPUT", "Describe what you want to plan (at least 3 characters).");
  if (cleanGoal.length > MAX_GOAL_CHARS) throw new AppError("INVALID_INPUT", `Keep the goal under ${MAX_GOAL_CHARS} characters.`);

  const tasks = await callOpenAI(job, cleanGoal);
  return { planId: randomUUID(), goal: cleanGoal, tasks };
}
