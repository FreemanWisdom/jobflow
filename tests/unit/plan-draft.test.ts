import { describe, expect, it } from "vitest";
import { blankTaskIndexes } from "@/app/(authenticated)/jobs/[id]/plan-draft";

describe("blankTaskIndexes", () => {
  it("returns no indexes when every row has a title", () => {
    expect(blankTaskIndexes([{ title: "First", dueDate: "" }, { title: "  Second  ", dueDate: "2026-11-05" }])).toEqual([]);
  });

  it("detects empty and whitespace-only titles", () => {
    const tasks = [
      { title: "Valid task", dueDate: "" },
      { title: "", dueDate: "" },
      { title: "   ", dueDate: "2026-11-05" },
      { title: "Also valid", dueDate: "" },
      { title: String.fromCharCode(9), dueDate: "" }, // a lone tab
    ];
    expect(blankTaskIndexes(tasks)).toEqual([1, 2, 4]);
  });

  it("reports every row blank for an empty draft", () => {
    expect(blankTaskIndexes([])).toEqual([]);
  });
});
