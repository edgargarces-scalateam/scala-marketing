export const statuses = [
  "Backlog",
  "Planned",
  "In progress",
  "Waiting for review",
  "Changes requested",
  "Approved",
  "Completed",
  "Blocked",
  "Cancelled",
];
export const priorities = ["Low", "Medium", "High", "Urgent"];
export const channels = [
  "Instagram",
  "Facebook",
  "LinkedIn",
  "Meta Ads",
  "Google Ads",
  "Email",
  "Website",
  "Webinar",
  "Other",
];
export const types = [
  "Strategy",
  "Copywriting",
  "Graphic design",
  "Video",
  "Landing page",
  "Paid advertising",
  "Social media",
  "Email marketing",
  "Webinar",
  "Analytics",
  "Reporting",
  "Approval",
  "Other",
];
export type Role =
  | "Administrator"
  | "Manager"
  | "Agency Editor"
  | "Contributor"
  | "Viewer";
export type Task = {
  kind?: "task" | "event" | "milestone";
  startAt?: string;
  endAt?: string;
  id: string;
  title: string;
  description: string;
  project: string;
  campaign: string;
  channel: string;
  type: string;
  assignee: string;
  collaborators: string[];
  start: string;
  end: string;
  effort: number;
  status: string;
  priority: string;
  progress: number;
  dependencies: string[];
  tags: string[];
  approval: string;
  checklist: { text: string; done: boolean }[];
  comments: { text: string; author: string; at: string }[];
  attachments: { name: string; url: string }[];
  history: { text: string; author: string; at: string }[];
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
  completedAt?: string;
};
export const people = ["Edgar Garcés"];
export function canEdit(role: Role, task: Task, name: string) {
  return (
    ["Administrator", "Manager", "Agency Editor"].includes(role) ||
    (role === "Contributor" && task.assignee === name)
  );
}
export function conflicts(
  tasks: Task[],
  capacity = 40,
  projectEnds?: Record<string, string>,
) {
  const out: { task: string; text: string }[] = [];
  const active = tasks.filter(
    (t) => !["Completed", "Cancelled"].includes(t.status),
  );
  for (const t of active) {
    for (const id of t.dependencies) {
      const d = tasks.find((x) => x.id === id);
      if (d && d.end > t.start)
        out.push({
          task: t.id,
          text: `${t.title} starts before ${d.title} finishes`,
        });
    }
    if (t.end > (projectEnds?.[t.project] || "2026-10-30"))
      out.push({
        task: t.id,
        text: `${t.title} extends beyond the project end`,
      });
    for (const other of active) {
      if (
        t.id < other.id &&
        t.assignee &&
        t.assignee === other.assignee &&
        t.start <= other.end &&
        other.start <= t.end
      )
        out.push({
          task: t.id,
          text: `${t.assignee}: ${t.title} overlaps ${other.title}`,
        });
    }
  }
  for (const person of new Set(active.map((t) => t.assignee).filter(Boolean))) {
    const weeks = new Map<string, number>();
    for (const t of active.filter((x) => x.assignee === person)) {
      const date = new Date(t.start + "T12:00:00Z");
      date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
      const key = date.toISOString().slice(0, 10);
      weeks.set(key, (weeks.get(key) || 0) + t.effort);
    }
    for (const [week, hours] of weeks)
      if (hours > capacity)
        out.push({
          task: "",
          text: `${person} exceeds ${capacity}h capacity in week of ${week} (${hours}h)`,
        });
  }
  return out;
}
const names = [
  "Campaign strategy",
  "Static creative concepts",
  "Creative approval",
  "Reel scripts",
  "Video recording",
  "Video editing",
  "Landing-page development",
  "Landing-page approval",
  "Meta Pixel configuration",
  "Meta campaign setup",
  "Audience configuration",
  "Registration testing",
  "Reminder email preparation",
  "Webinar presentation preparation",
  "Final technical test",
  "Live webinar",
  "Lead export and follow-up",
  "Campaign performance report",
];
export function seedTasks(): Task[] {
  return names.map((title, i) => ({
    id: `task-${i + 1}`,
    title,
    description: `Prepare and coordinate ${title.toLowerCase()} for Scala’s automation webinar. Share deliverables with the team for review.`,
    project: "Automation Webinar",
    campaign: "October webinar launch",
    channel: i < 6 ? "Instagram" : i < 12 ? "Website" : "Webinar",
    type: types[i % types.length],
    assignee: i % 3 === 0 ? people[0] : "",
    collaborators: [],
    start:
      i === 15
        ? "2026-10-24"
        : `2026-10-${String(Math.min(23, 5 + i)).padStart(2, "0")}`,
    end:
      i === 15
        ? "2026-10-24"
        : i === 16
          ? "2026-10-27"
          : i === 17
            ? "2026-10-29"
            : `2026-10-${String(Math.min(29, 8 + i)).padStart(2, "0")}`,
    effort: 4 + (i % 4) * 2,
    status:
      i < 3
        ? "Completed"
        : i === 3
          ? "Waiting for review"
          : i === 8
            ? "Blocked"
            : i < 10
              ? "In progress"
              : "Planned",
    priority: i === 8 ? "Urgent" : i % 3 === 0 ? "High" : "Medium",
    progress: i < 3 ? 100 : i < 10 ? 45 : 0,
    dependencies: i ? [`task-${i}`] : [],
    tags: ["webinar"],
    approval: i === 3 ? "Pending" : "Not requested",
    checklist: [
      { text: "Prepare first draft", done: i < 3 },
      { text: "Review with Scala team", done: i < 3 },
    ],
    comments: [],
    attachments: [],
    history: [],
    createdBy: "seed",
    createdAt: "2026-10-01T12:00:00Z",
    updatedBy: "seed",
    updatedAt: "2026-10-01T12:00:00Z",
  }));
}

export function hasDependencyCycle(tasks: Task[]) {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const visiting = new Set<string>(),
    visited = new Set<string>();
  function visit(id: string): boolean {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    for (const dep of byId.get(id)?.dependencies || [])
      if (visit(dep)) return true;
    visiting.delete(id);
    visited.add(id);
    return false;
  }
  return tasks.some((t) => visit(t.id));
}
