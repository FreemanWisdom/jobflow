/**
 * Pure helpers for the AI planner's client-side draft. Extracted from the
 * component so the approval validation is unit-testable without a DOM.
 */

export type DraftTask = { title: string; dueDate: string };

/**
 * Indexes of draft rows whose title is blank after trimming. The approval
 * flow refuses to submit while any row is blank: users must fill them in or
 * remove them, instead of rows being silently dropped.
 */
export function blankTaskIndexes(tasks: DraftTask[]): number[] {
  return tasks.reduce<number[]>((indexes, task, index) => {
    if (!task.title.trim()) indexes.push(index);
    return indexes;
  }, []);
}
