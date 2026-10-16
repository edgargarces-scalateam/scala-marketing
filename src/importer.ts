import {
  statuses,
  priorities,
  channels,
  types,
  hasDependencyCycle,
  type Task,
  type Role,
} from "./domain";
import type { Plan } from "./catalog";
export const IMPORT_LIMIT = 200;
export type ImportRecord = {
  collection: "tasks" | "projects" | "campaigns";
  data: Task | Plan;
};
export type ImportOptions = {
  uid: string;
  name: string;
  role: Role;
  people: string[];
  projects: Plan[];
  campaigns: Plan[];
  tasks: Task[];
  statuses?: string[];
  priorities?: string[];
  channels?: string[];
  types?: string[];
  timezone?: string;
};
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false,
    closed = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else cell += c;
    } else if (c === '"') {
      if (cell || closed) throw Error("Invalid CSV quote.");
      quoted = true;
    } else if (c === ",") {
      row.push(cell);
      cell = "";
      closed = false;
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
      cell = "";
      closed = false;
    } else {
      if (closed && c.trim())
        throw Error("Unexpected text after a quoted CSV field.");
      if (!closed) cell += c;
    }
  }
  if (quoted) throw Error("Unclosed CSV quote.");
  row.push(cell);
  if (row.some((v) => v.trim())) rows.push(row);
  if (!rows.length) throw Error("The import file is empty.");
  const headers = rows.shift()!.map((v) =>
    v
      .trim()
      .replace(/^\uFEFF/, "")
      .toLowerCase(),
  );
  if (new Set(headers).size !== headers.length || headers.some((v) => !v))
    throw Error("CSV headers must be unique and nonempty.");
  return rows.map((values, i) => {
    if (values.length !== headers.length)
      throw Error(`Row ${i + 2}: column count does not match the header.`);
    return Object.fromEntries(headers.map((h, j) => [h, values[j]]));
  });
}
function csvValue(row: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = row[key] ?? row[key.toLowerCase()];
    if (value !== undefined && value !== null) return String(value).trim();
  }
  return "";
}
function list(row: Record<string, unknown>, key: string) {
  const value = row[key];
  return Array.isArray(value)
    ? value.map(String)
    : csvValue(row, key)
        .split(";")
        .map((v) => v.trim())
        .filter(Boolean);
}
function date(value: string, label: string) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(Date.parse(value + "T12:00:00Z")) ||
    new Date(value + "T12:00:00Z").toISOString().slice(0, 10) !== value
  )
    throw Error(`${label}: use a valid YYYY-MM-DD date.`);
  return value;
}
function instant(value: string) {
  date(value.slice(0, 10), "Event date");
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.test(
      value,
    ) ||
    Number(value.slice(11, 13)) > 23
  )
    throw Error("Use a valid ISO event timestamp.");
  if (!/(Z|[+-]\d\d:\d\d)$/.test(value) || !Number.isFinite(Date.parse(value)))
    throw Error("Event timestamps must include Z or a timezone offset.");
  return new Date(value).toISOString();
}
function number(
  row: Record<string, unknown>,
  key: string,
  fallback: number,
  min: number,
  max: number,
) {
  const raw = csvValue(row, key),
    v = raw ? Number(raw) : fallback;
  if (!Number.isFinite(v) || v < min || v > max)
    throw Error(`${key}: enter a number from ${min} to ${max}.`);
  return v;
}
export function previewImport(
  text: string,
  format: "csv" | "json",
  options: ImportOptions,
) {
  if (new TextEncoder().encode(text).length > 2 * 1024 * 1024)
    throw Error("Import files must be 2 MB or smaller.");
  let input: unknown[];
  if (format === "csv") input = parseCsv(text);
  else {
    const json = JSON.parse(text);
    if (Array.isArray(json)) input = json;
    else if (json && typeof json === "object") {
      input = [];
      for (const [key, value] of Object.entries(json)) {
        const kind = (
          {
            tasks: "task",
            events: "event",
            milestones: "milestone",
            projects: "project",
            campaigns: "campaign",
          } as Record<string, string>
        )[key];
        if (!kind || !Array.isArray(value))
          throw Error(
            "JSON keys must be tasks, events, milestones, projects or campaigns, each containing an array.",
          );
        input.push(...value.map((v) => ({ ...v, kind })));
      }
    } else throw Error("Use a JSON array or an object with record arrays.");
  }
  if (!input.length || input.length > IMPORT_LIMIT)
    throw Error(`Import between 1 and ${IMPORT_LIMIT} records at a time.`);
  if (!["Administrator", "Manager", "Agency Editor"].includes(options.role))
    throw Error("Your role cannot import activities.");
  const now = new Date().toISOString(),
    errors: string[] = [],
    records: ImportRecord[] = [];
  const rows = input.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item))
      throw Error(`Row ${index + 1}: expected an object.`);
    const row = item as Record<string, unknown>;
    return {
      row,
      index,
      kind: csvValue(row, "kind") || "task",
      id: csvValue(row, "id") || crypto.randomUUID(),
    };
  });
  const ids = new Set<string>();
  for (const item of rows) {
    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(item.id))
      errors.push(`Row ${item.index + 1}: invalid ID.`);
    if (ids.has(item.id))
      errors.push(`Row ${item.index + 1}: duplicate ID ${item.id}.`);
    ids.add(item.id);
  }
  const plans = (kind: "project" | "campaign") => {
    for (const { row, index, id, kind: rowKind } of rows.filter(
      (r) => r.kind === kind,
    )) {
      try {
        if (!["Administrator", "Manager"].includes(options.role))
          throw Error(
            "Only administrators and managers may import projects or campaigns.",
          );
        const existing =
          kind === "project" ? options.projects : options.campaigns;
        if (existing.some((p) => p.id === id))
          throw Error(
            "This ID already exists. Imports create new records only.",
          );
        const name = csvValue(row, "name", "title");
        if (!name || name.length > 300)
          throw Error("A name of up to 300 characters is required.");
        if (
          [
            ...existing,
            ...records
              .filter(
                (r) =>
                  r.collection ===
                  (kind === "project" ? "projects" : "campaigns"),
              )
              .map((r) => r.data as Plan),
          ].some((p) => p.name.toLowerCase() === name.toLowerCase())
        )
          throw Error("This name already exists.");
        const start = date(csvValue(row, "start"), "start"),
          end = date(csvValue(row, "end", "due"), "end");
        if (start > end) throw Error("Start must be before the due date.");
        const data: Plan = {
          id,
          name,
          description: csvValue(row, "description"),
          start,
          end,
          archived: false,
        };
        if (rowKind === "campaign") {
          const project = csvValue(row, "project", "projectId");
          const projectList = [
            ...options.projects,
            ...records
              .filter((r) => r.collection === "projects")
              .map((r) => r.data as Plan),
          ];
          const match = projectList.find(
            (p) =>
              p.id === project ||
              p.name.toLowerCase() === project.toLowerCase(),
          );
          if (!match)
            throw Error(
              "Campaigns must reference an existing or imported project.",
            );
          data.projectId = match.id;
        }
        records.push({
          collection: kind === "project" ? "projects" : "campaigns",
          data,
        });
      } catch (e) {
        errors.push(`Row ${index + 1}: ${(e as Error).message}`);
      }
    }
  };
  plans("project");
  plans("campaign");
  const allProjects = [
      ...options.projects,
      ...records
        .filter((r) => r.collection === "projects")
        .map((r) => r.data as Plan),
    ],
    allCampaigns = [
      ...options.campaigns,
      ...records
        .filter((r) => r.collection === "campaigns")
        .map((r) => r.data as Plan),
    ];
  for (const { row, index, id, kind } of rows.filter(
    (r) => !["project", "campaign"].includes(r.kind),
  )) {
    try {
      if (!["task", "event", "milestone"].includes(kind))
        throw Error(
          "kind must be task, event, milestone, project or campaign.",
        );
      if (options.tasks.some((t) => t.id === id))
        throw Error(
          "This ID already exists. Imports never overwrite existing activities.",
        );
      const title = csvValue(row, "title", "name");
      if (!title || title.length > 300)
        throw Error("A title of up to 300 characters is required.");
      const startAt = csvValue(row, "startAt")
          ? instant(csvValue(row, "startAt"))
          : "",
        endAt = csvValue(row, "endAt") ? instant(csvValue(row, "endAt")) : "";
      const day = (v: string) =>
        new Intl.DateTimeFormat("en-CA", {
          timeZone: options.timezone || "America/Guayaquil",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date(v));
      const start = date(
          csvValue(row, "start") || (startAt ? day(startAt) : ""),
          "start",
        ),
        end = date(
          csvValue(row, "end", "due") ||
            (endAt ? day(endAt) : kind === "milestone" ? start : ""),
          "end",
        );
      if (start > end || (startAt && endAt && startAt > endAt))
        throw Error("Start must be before the end.");
      const choose = (key: string, allowed: string[], fallback: string) => {
        const value = csvValue(row, key) || fallback;
        const found = allowed.find(
          (v) => v.toLowerCase() === value.toLowerCase(),
        );
        if (!found) throw Error(`${key}: unknown value ${value}.`);
        return found;
      };
      const assigneeValue = csvValue(row, "assignee");
      const assignee =
        options.people.find(
          (p) => p.toLowerCase() === assigneeValue.toLowerCase(),
        ) || "";
      if (assigneeValue && !assignee)
        throw Error(`Assignee ${assigneeValue} is not a registered member.`);
      const projectValue = csvValue(row, "project"),
        campaignValue = csvValue(row, "campaign");
      const project = allProjects.find(
          (p) =>
            p.id === projectValue ||
            p.name.toLowerCase() === projectValue.toLowerCase(),
        ),
        campaign = allCampaigns.find(
          (p) =>
            p.id === campaignValue ||
            p.name.toLowerCase() === campaignValue.toLowerCase(),
        );
      if (projectValue && !project) throw Error("Unknown project.");
      if (campaignValue && !campaign) throw Error("Unknown campaign.");
      if (project && campaign && campaign.projectId !== project.id)
        throw Error("Campaign does not belong to this project.");
      const status = choose("status", options.statuses || statuses, "Planned");
      if (["Approved", "Changes requested"].includes(status))
        throw Error(
          "Import approval decisions separately through the review workflow.",
        );
      const data: Task = {
        id,
        kind: kind as Task["kind"],
        title,
        description: csvValue(row, "description"),
        project: project?.name || "",
        campaign: campaign?.name || "",
        channel: choose(
          "channel",
          options.channels || channels,
          kind === "event" ? "Webinar" : "Other",
        ),
        type: choose("type", options.types || types, "Other"),
        assignee,
        collaborators: [],
        start,
        end,
        effort: number(row, "effort", kind === "task" ? 4 : 0, 0, 1000),
        status,
        priority: choose(
          "priority",
          options.priorities || priorities,
          "Medium",
        ),
        progress:
          status === "Completed" ? 100 : number(row, "progress", 0, 0, 100),
        dependencies: list(row, "dependencies"),
        tags: list(row, "tags"),
        approval: "Not requested",
        checklist: [],
        comments: [],
        attachments: [],
        history: [{ text: "Imported activity", author: options.name, at: now }],
        createdBy: options.uid,
        createdAt: now,
        updatedBy: options.uid,
        updatedAt: now,
        ...(startAt ? { startAt } : {}),
        ...(endAt ? { endAt } : {}),
        ...(status === "Completed" ? { completedAt: now } : {}),
      };
      if (data.description.length > 20000)
        throw Error("Description exceeds 20,000 characters.");
      records.push({ collection: "tasks", data });
    } catch (e) {
      errors.push(`Row ${index + 1}: ${(e as Error).message}`);
    }
  }
  const importedTasks = records
      .filter((r) => r.collection === "tasks")
      .map((r) => r.data as Task),
    combined = [...options.tasks, ...importedTasks];
  for (const t of importedTasks)
    for (const dep of t.dependencies)
      if (!combined.some((task) => task.id === dep))
        errors.push(`${t.title}: missing dependency ${dep}.`);
  if (hasDependencyCycle(combined))
    errors.push("Dependencies cannot form a cycle.");
  return { records, errors };
}
export const CSV_TEMPLATE =
  "kind,id,title,project,campaign,assignee,start,end,status,priority,channel,type,effort,dependencies,tags\ntask,task-new-1,Prepare launch assets,,,,2026-10-20,2026-10-22,Planned,High,Website,Graphic design,8,,launch\nevent,event-new-1,Planning meeting,,,,2026-10-23,2026-10-23,Planned,Medium,Other,Other,0,task-new-1,team\nmilestone,milestone-new-1,Launch day,,,,2026-10-24,2026-10-24,Planned,High,Website,Other,0,task-new-1,launch\n";
