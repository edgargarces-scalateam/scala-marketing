import { describe, it, expect } from "vitest";
import { seedTasks, conflicts, canEdit, hasDependencyCycle } from "./domain";
describe("scheduling", () => {
  it("detects overlapping assignments and dependency conflicts without mutating schedules", () => {
    const [a, b] = seedTasks();
    a.status = "Planned";
    b.status = "Planned";
    b.assignee = a.assignee;
    b.start = a.start;
    b.end = a.end;
    b.dependencies = [a.id];
    const before = JSON.stringify([a, b]);
    const result = conflicts([a, b]);
    expect(result.some((x) => x.text.includes("overlaps"))).toBe(true);
    expect(result.some((x) => x.text.includes("before"))).toBe(true);
    expect(JSON.stringify([a, b])).toBe(before);
  });
  it("ignores completed work in workload", () => {
    const t = seedTasks()[0];
    t.status = "Completed";
    t.effort = 100;
    expect(conflicts([t], 10)).toEqual([]);
  });
  it("does not count different weeks as the same capacity window", () => {
    const [a, b] = seedTasks();
    a.status = b.status = "Planned";
    a.effort = b.effort = 30;
    b.assignee = a.assignee;
    b.start = "2026-10-20";
    b.end = "2026-10-21";
    b.dependencies = [];
    expect(conflicts([a, b], 40).some((x) => x.text.includes("capacity"))).toBe(
      false,
    );
  });
});
describe("permissions", () => {
  it("keeps viewer read only and contributors scoped to assigned work", () => {
    const t = seedTasks()[0];
    expect(canEdit("Viewer", t, t.assignee)).toBe(false);
    expect(canEdit("Contributor", t, t.assignee)).toBe(true);
    expect(canEdit("Contributor", t, "Unassigned colleague")).toBe(false);
    expect(canEdit("Manager", t, "Manager")).toBe(true);
  });
});

it("rejects dependency cycles", () => {
  const [a, b] = seedTasks();
  a.dependencies = [b.id];
  b.dependencies = [a.id];
  expect(hasDependencyCycle([a, b])).toBe(true);
  a.dependencies = [];
  expect(hasDependencyCycle([a, b])).toBe(false);
});
