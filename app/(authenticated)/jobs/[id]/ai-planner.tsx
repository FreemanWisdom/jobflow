"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { generatePlanAction } from "@/lib/planning/actions";
import { createTasksBulkAction } from "@/lib/tasks/actions";
import { blankTaskIndexes, type DraftTask } from "./plan-draft";

type Draft = { planId: string; goal: string; tasks: DraftTask[] };

// Mirrors MAX_BULK_TASKS in lib/tasks/data-access.ts; the bulk creator
// rejects larger batches, so the preview refuses to grow past it.
const MAX_ROWS = 50;

/**
 * AI task planner panel for the job detail page. The AI is called exactly
 * once per "Generate plan" click — never during rendering and never while
 * the preview is being edited. The draft lives in client state only; tasks
 * reach the database only through the Phase A bulk-creation action when the
 * user approves, which keeps ownership checks, validation, atomicity and
 * duplicate protection in one server-side place.
 */
export function AiPlanner({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [goal, setGoal] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pending, setPending] = useState<"" | "generating" | "approving">("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showBlankWarnings, setShowBlankWarnings] = useState(false);

  async function generate(event: React.FormEvent) {
    event.preventDefault();
    if (!goal.trim()) {
      setError("Describe what you want to plan first.");
      return;
    }
    setPending("generating");
    setError("");
    setNotice("");
    setShowBlankWarnings(false);
    try {
      const result = await generatePlanAction(jobId, goal);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setDraft({ planId: result.draft.planId, goal: result.draft.goal, tasks: result.draft.tasks.map(task => ({ title: task.title, dueDate: task.dueDate ?? "" })) });
    } catch {
      // The action returns typed failures as data; reaching this means an
      // unexpected transport-level failure. Surface it instead of leaving
      // the panel stuck on "Generating…".
      setError("The plan could not be generated. Check your connection and try again in a moment.");
    } finally {
      setPending("");
    }
  }

  function editTask(index: number, patch: Partial<DraftTask>) {
    setDraft(current => (current ? { ...current, tasks: current.tasks.map((task, i) => (i === index ? { ...task, ...patch } : task)) } : current));
  }

  function removeTask(index: number) {
    setDraft(current => (current ? { ...current, tasks: current.tasks.filter((_, i) => i !== index) } : current));
  }

  function addTask() {
    setDraft(current => (current && current.tasks.length < MAX_ROWS ? { ...current, tasks: [...current.tasks, { title: "", dueDate: "" }] } : current));
  }

  async function approve() {
    if (!draft) return;
    if (!draft.tasks.length) {
      setError("Add at least one task before approving.");
      return;
    }
    const blanks = blankTaskIndexes(draft.tasks);
    if (blanks.length > 0) {
      setShowBlankWarnings(true);
      const positions = blanks.map(index => index + 1).join(", ");
      setError(`Task ${blanks.length === 1 ? "row" : "rows"} ${positions} ${blanks.length === 1 ? "needs" : "need"} a title. Fill ${blanks.length === 1 ? "it" : "them"} in or remove ${blanks.length === 1 ? "it" : "them"} before approving.`);
      return;
    }
    setShowBlankWarnings(false);
    setPending("approving");
    setError("");
    setNotice("");
    try {
      // Submit exactly the rows shown: nothing is silently dropped, and the
      // Phase A creator re-validates every title and date server-side.
      const tasks = draft.tasks.map(task => ({ title: task.title.trim(), dueDate: task.dueDate || null }));
      const result = await createTasksBulkAction(jobId, draft.planId, tasks);
      setNotice(result.duplicate ? "This plan was already applied, so nothing was added twice." : `Added ${result.created.length} task${result.created.length === 1 ? "" : "s"}.`);
      setDraft(null);
      setGoal("");
    } catch {
      setError("The tasks could not be saved. Check that every title is under 200 characters and every due date is valid, then try again.");
    } finally {
      setPending("");
      router.refresh();
    }
  }

  function discard() {
    setDraft(null);
    setError("");
    setNotice("");
    setShowBlankWarnings(false);
  }

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 sm:p-7">
      <h2 className="text-base font-semibold text-slate-900">Plan tasks with AI</h2>
      <p className="mt-1 text-sm text-slate-500">Describe a goal and review the proposed tasks. Nothing is saved until you approve.</p>
      {error && <p role="alert" className="mt-4 rounded-md bg-rose-50 p-3 text-sm font-medium text-rose-700">{error}</p>}
      {notice && <p role="status" className="mt-4 rounded-md bg-emerald-50 p-3 text-sm font-medium text-emerald-700">{notice}</p>}
      {!draft ? (
        <form onSubmit={generate} className="mt-4 space-y-3">
          <textarea
            value={goal}
            onChange={event => setGoal(event.target.value)}
            placeholder="e.g. Prepare and deliver the client presentation by Friday"
            rows={3}
            maxLength={2000}
            disabled={pending === "generating"}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <button type="submit" disabled={pending !== ""} className="rounded-md bg-violet-700 px-3.5 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {pending === "generating" ? "Generating…" : "Generate plan"}
          </button>
        </form>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-slate-600">
            Draft for: <span className="font-medium">{draft.goal}</span>
          </p>
          <div className="space-y-2">
            {draft.tasks.map((task, index) => (
              <div key={index} className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={task.title}
                  onChange={event => editTask(index, { title: event.target.value })}
                  maxLength={200}
                  placeholder="Task title"
                  aria-label={`Task ${index + 1} title`}
                  className={`min-w-0 flex-1 rounded-md border px-3 py-2 text-sm ${showBlankWarnings && !task.title.trim() ? "border-rose-400 bg-rose-50" : "border-slate-300"}`}
                />
                <input
                  type="date"
                  value={task.dueDate}
                  onChange={event => editTask(index, { dueDate: event.target.value })}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
                <button onClick={() => removeTask(index)} disabled={pending !== ""} className="text-xs font-semibold text-rose-700 disabled:opacity-50">
                  Remove
                </button>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
            <button onClick={approve} disabled={pending !== ""} className="rounded-md bg-violet-700 px-3.5 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {pending === "approving" ? "Saving…" : `Approve ${draft.tasks.length} task${draft.tasks.length === 1 ? "" : "s"}`}
            </button>
            <button onClick={addTask} disabled={pending !== "" || draft.tasks.length >= MAX_ROWS} className="rounded-md border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">
              Add task
            </button>
            <button onClick={discard} disabled={pending !== ""} className="rounded-md border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">
              Discard
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
