import { describe, it, expect } from "vitest";
import { previewImport, parseCsv, CSV_TEMPLATE } from "./importer";
import { normalizeUsername, usernameEmail } from "./identity";
const initialProjects = [
    {
      id: "webinar",
      name: "Automation Webinar",
      description: "",
      start: "2026-10-05",
      end: "2026-10-30",
      archived: false,
    },
  ],
  initialCampaigns = [
    {
      id: "october",
      name: "October webinar launch",
      description: "",
      projectId: "webinar",
      start: "2026-10-05",
      end: "2026-10-30",
      archived: false,
    },
  ];
const options = {
  uid: "admin",
  name: "Edgar Garcés",
  role: "Administrator" as const,
  people: ["Edgar Garcés"],
  projects: initialProjects,
  campaigns: initialCampaigns,
  tasks: [],
};
describe("bulk import", () => {
  it("parses quoted CSV commas, escaped quotes and multiline cells", () => {
    expect(
      parseCsv('title,description\n"A, B","Line 1\nLine ""2"""\n'),
    ).toEqual([{ title: "A, B", description: 'Line 1\nLine "2"' }]);
  });
  it("previews tasks, events and milestones from the downloadable template", () => {
    const result = previewImport(CSV_TEMPLATE, "csv", options);
    expect(result.errors).toEqual([]);
    expect(
      result.records.map((r) => ("kind" in r.data ? r.data.kind : "")),
    ).toEqual(["task", "event", "milestone"]);
    expect(result.records[1].data).toMatchObject({ effort: 0 });
  });
  it("resolves project, campaign and registered assignee names", () => {
    const result = previewImport(
      JSON.stringify({
        tasks: [
          {
            id: "imported",
            title: "Deliver assets",
            project: "webinar",
            campaign: "october",
            assignee: "edgar garcés",
            start: "2026-10-20",
            end: "2026-10-22",
          },
        ],
      }),
      "json",
      options,
    );
    expect(result.errors).toEqual([]);
    expect(result.records[0].data).toMatchObject({
      project: "Automation Webinar",
      assignee: "Edgar Garcés",
    });
  });
  it("rejects unknown assignees and invalid dates without returning valid import approval", () => {
    const result = previewImport(
      JSON.stringify([
        { title: "Test", start: "2026-02-30", end: "2026-03-02" },
        {
          title: "Unknown",
          assignee: "Marketing agency",
          start: "2026-10-20",
          end: "2026-10-21",
        },
      ]),
      "json",
      options,
    );
    expect(result.errors).toHaveLength(2);
  });
  it("rejects overwrite IDs, cycles and missing dependencies", () => {
    const rows = [
      {
        id: "a",
        title: "A",
        start: "2026-10-20",
        end: "2026-10-21",
        dependencies: ["b"],
      },
      {
        id: "b",
        title: "B",
        start: "2026-10-20",
        end: "2026-10-21",
        dependencies: ["a"],
      },
    ];
    expect(
      previewImport(JSON.stringify(rows), "json", options).errors,
    ).toContain("Dependencies cannot form a cycle.");
    rows[0].dependencies = ["missing"];
    expect(
      previewImport(JSON.stringify(rows), "json", options).errors.some((e) =>
        e.includes("missing dependency"),
      ),
    ).toBe(true);
  });
  it("imports parent plans before activities and normalizes timed events to UTC", () => {
    const result = previewImport(
      JSON.stringify({
        events: [
          {
            id: "meeting",
            title: "Planning",
            startAt: "2026-10-24T11:00:00-07:00",
            endAt: "2026-10-24T12:00:00-07:00",
            project: "growth",
            campaign: "launch",
          },
        ],
        campaigns: [
          {
            id: "launch",
            name: "Launch",
            project: "growth",
            start: "2026-10-20",
            end: "2026-10-30",
          },
        ],
        projects: [
          {
            id: "growth",
            name: "Growth",
            start: "2026-10-20",
            end: "2026-10-30",
          },
        ],
      }),
      "json",
      options,
    );
    expect(result.errors).toEqual([]);
    expect(result.records[2].data).toMatchObject({
      startAt: "2026-10-24T18:00:00.000Z",
      kind: "event",
    });
  });
  it("enforces import role boundaries, count limits and explicit approval workflows", () => {
    expect(() =>
      previewImport("[]", "json", { ...options, role: "Viewer" }),
    ).toThrow();
    expect(() =>
      previewImport(
        JSON.stringify(Array.from({ length: 201 }, () => ({ title: "test" }))),
        "json",
        options,
      ),
    ).toThrow("200");
    expect(
      previewImport(
        JSON.stringify({
          projects: [{ name: "No", start: "2026-10-20", end: "2026-10-21" }],
        }),
        "json",
        { ...options, role: "Agency Editor" },
      ).errors[0],
    ).toContain("Only administrators");
    expect(
      previewImport(
        '[{"title":"Test","start":"2026-10-20","end":"2026-10-21","status":"Approved"}]',
        "json",
        options,
      ).errors[0],
    ).toContain("approval");
  });
});
describe("username login", () => {
  it("normalizes identifiers without exposing a username directory", () => {
    expect(normalizeUsername(" Edgar.Garces ")).toBe("edgar.garces");
    expect(usernameEmail("EDGAR")).toBe("edgar@users.scala.invalid");
    for (const value of ["a", "../admin", "name@email.com", "ááá", "a b"])
      expect(() => usernameEmail(value)).toThrow();
  });
});
