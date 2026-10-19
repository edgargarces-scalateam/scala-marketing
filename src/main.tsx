import { BulkImport } from "./BulkImport";
import { usernameEmail } from "./identity";
import type { ImportRecord } from "./importer";
import { useCatalog, Catalog } from "./catalog";
import { useI18n, LanguageProvider, LanguageToggle } from "./i18n";
import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  LayoutDashboard,
  ChartNoAxesGantt,
  CalendarDays,
  Columns3,
  List,
  Users,
  CheckCheck,
  Bell,
  Search,
  Plus,
  ChevronRight,
  ChevronLeft,
  ArrowUpRight,
  Settings,
  LogOut,
  X,
  Paperclip,
  Check,
  Download,
  SlidersHorizontal,
  Flag,
} from "lucide-react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  getDoc,
  writeBatch,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Timeline } from "./Timeline";
import {
  auth,
  db,
  storage,
  configured,
  demoEnabled,
  attachmentsEnabled,
} from "./firebase";
import {
  statuses,
  priorities,
  channels,
  types,
  people as samplePeople,
  seedTasks,
  conflicts,
  canEdit,
  hasDependencyCycle,
  type Task,
  type Role,
} from "./domain";
import "./style.css";
const nav = [
  ["Overview", LayoutDashboard],
  ["Projects", Flag],
  ["Timeline", ChartNoAxesGantt],
  ["Calendar", CalendarDays],
  ["Board", Columns3],
  ["All activities", List],
  ["Workload", Users],
  ["Approvals", CheckCheck],
] as const;
function App() {
  const { t: tr, language } = useI18n();
  const [session, setSession] = useState<{
      uid: string;
      name: string;
      role: Role;
    } | null>(null),
    [ready, setReady] = useState(!configured),
    [demo, setDemo] = useState(false),
    [tasks, setTasks] = useState<Task[]>([]),
    [people, setPeople] = useState<string[]>([]),
    [view, setView] = useState("Overview"),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [person, setPerson] = useState(""),
    [priority, setPriority] = useState(""),
    [timeFilter, setTimeFilter] = useState(""),
    [selected, setSelected] = useState<Task | null>(null),
    [importOpen, setImportOpen] = useState(false),
    [projectRequest, setProjectRequest] = useState(0),
    [toast, setToast] = useState(""),
    [error, setError] = useState(""),
    [notify, setNotify] = useState(false),
    [timezone, setTimezone] = useState(
      localStorage.getItem("scala-timezone") || "America/Guayaquil",
    ),
    [capacity, setCapacity] = useState(40),
    [custom, setCustom] = useState(statuses),
    [taxonomy, setTaxonomy] = useState({
      priorities,
      channels,
      types,
    }),
    [saved, setSaved] = useState<
      {
        name: string;
        search: string;
        status: string;
        person: string;
        priority: string;
      }[]
    >(JSON.parse(localStorage.getItem("scala-filters") || "[]"));
  useEffect(
    () =>
      onAuthStateChanged(auth, async (u) => {
        if (u) {
          try {
            const p = await getDoc(doc(db, "users", u.uid));
            if (!p.exists())
              throw Error(
                "Your account has not been invited. Ask an administrator to provision your profile.",
              );
            setSession({
              uid: u.uid,
              ...p.data(),
            } as any);
          } catch (e) {
            setError((e as Error).message);
          }
        } else setSession(null);
        setReady(true);
      }),
    [],
  );
  useEffect(() => {
    if (!session) return;
    if (demo) {
      setTasks(
        (
          JSON.parse(localStorage.getItem("scala-demo") || "null") ||
          seedTasks()
        ).map((task: Task) => ({
          ...task,
          assignee: samplePeople.includes(task.assignee) ? task.assignee : "",
        })),
      );
      return;
    }
    return onSnapshot(
      collection(db, "tasks"),
      (s) =>
        setTasks(
          s.docs.map(
            (d) =>
              ({
                ...d.data(),
                id: d.id,
              }) as Task,
          ),
        ),
      (e) => setError(e.message),
    );
  }, [session, demo]);
  useEffect(() => {
    if (toast) {
      const id = setTimeout(() => setToast(""), 3500);
      return () => clearTimeout(id);
    }
  }, [toast]);
  useEffect(() => {
    if (!session || demo) return;
    return onSnapshot(doc(db, "settings", "workspace"), (d) => {
      if (d.exists()) {
        setCustom(d.data().statuses || statuses);
        setTaxonomy({
          priorities: d.data().priorities || priorities,
          channels: d.data().channels || channels,
          types: d.data().types || types,
        });
        setCapacity(d.data().capacity || 40);
      }
    });
  }, [session, demo]);
  useEffect(() => {
    if (!session || demo) return;
    return onSnapshot(collection(db, "users"), (s) =>
      setPeople(
        [
          ...new Set(
            s.docs
              .map((d) => d.data().name as string)
              .filter((name) => typeof name === "string" && name.trim()),
          ),
        ].sort((a, b) => a.localeCompare(b)),
      ),
    );
  }, [session, demo]);
  const catalog = useCatalog(demo, !!session);
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const date = (value: string) =>
    new Intl.DateTimeFormat(language === "es" ? "es-EC" : "en-US", {
      timeZone: timezone,
      month: "short",
      day: "numeric",
    }).format(new Date(value + "T17:00:00Z"));
  const matchesTime = (t: Task) =>
    !timeFilter ||
    (timeFilter === "Overdue"
      ? t.end < today && !["Completed", "Cancelled"].includes(t.status)
      : timeFilter === "Due today"
        ? t.end === today
        : timeFilter === "Due this week"
          ? t.end >= today &&
            t.end <= new Date(Date.now() + 604800000).toISOString().slice(0, 10)
          : timeFilter === "Unassigned"
            ? !t.assignee
            : timeFilter === "With attachments"
              ? t.attachments.length > 0
              : timeFilter === "Blocked"
                ? t.status === "Blocked"
                : true);
  const filtered = tasks.filter(
    (t) =>
      matchesTime(t) &&
      (!search ||
        JSON.stringify(t).toLowerCase().includes(search.toLowerCase())) &&
      (!status || t.status === status) &&
      (!person || t.assignee === person) &&
      (!priority || t.priority === priority),
  );
  const warnings = conflicts(
    tasks,
    capacity,
    Object.fromEntries(catalog.projects.map((p) => [p.name, p.end])),
  );
  const overdue = tasks.filter(
    (t) => t.end < today && !["Completed", "Cancelled"].includes(t.status),
  );
  const approval = tasks.filter((t) => t.status === "Waiting for review");
  function flash(s: string) {
    setToast(s);
  }
  async function save(task: Task, change = "Updated activity") {
    if (!session || !canEdit(session.role, task, session.name)) {
      setError(tr("You do not have permission to edit this activity."));
      return;
    }
    if (task.startAt || task.endAt) {
      for (const value of [task.startAt, task.endAt].filter(
        Boolean,
      ) as string[]) {
        if (
          !/(Z|[+-]\d\d:\d\d)$/.test(value) ||
          !Number.isFinite(Date.parse(value))
        ) {
          setError(tr("Event timestamps must include Z or a timezone offset."));
          return;
        }
      }
      if (
        task.startAt &&
        task.endAt &&
        Date.parse(task.startAt) > Date.parse(task.endAt)
      ) {
        setError(tr("Start must be before the end."));
        return;
      }
      const day = (value: string) =>
        new Intl.DateTimeFormat("en-CA", {
          timeZone: timezone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date(value));
      task = {
        ...task,
        ...(task.startAt
          ? {
              startAt: new Date(task.startAt).toISOString(),
              start: day(task.startAt),
            }
          : {}),
        ...(task.endAt
          ? { endAt: new Date(task.endAt).toISOString(), end: day(task.endAt) }
          : {}),
      };
    }
    if (hasDependencyCycle([...tasks.filter((t) => t.id !== task.id), task])) {
      setError(
        tr(
          "Dependencies cannot form a cycle. Remove the circular dependency before saving.",
        ),
      );
      return;
    }
    if (
      !task.title.trim() ||
      task.start > task.end ||
      task.progress < 0 ||
      task.progress > 100
    ) {
      setError(
        tr("Enter a title, valid date range and progress between 0 and 100."),
      );
      return;
    }
    const previous = tasks.find((t) => t.id === task.id);
    if (previous) {
      const fields = (
        [
          "assignee",
          "start",
          "end",
          "status",
          "priority",
          "progress",
          "approval",
          "checklist",
          "comments",
          "attachments",
        ] as const
      ).filter(
        (key) => JSON.stringify(previous[key]) !== JSON.stringify(task[key]),
      );
      if (fields.length)
        change += ` · ${fields.map((key) => `${key}: ${["checklist", "comments", "attachments"].includes(key) ? "updated" : String(previous[key]) + " → " + String(task[key])}`).join("; ")}`;
    }
    const next = {
      ...task,
      progress: task.status === "Completed" ? 100 : task.progress,
      updatedAt: new Date().toISOString(),
      updatedBy: session.uid,
      completedAt:
        task.status === "Completed"
          ? new Date().toISOString()
          : task.completedAt || "",
      history: [
        ...task.history,
        {
          text: change,
          author: session.name,
          at: new Date().toISOString(),
        },
      ],
    };
    try {
      if (demo) {
        const all = tasks.some((t) => t.id === next.id)
          ? tasks.map((t) => (t.id === next.id ? next : t))
          : [...tasks, next];
        setTasks(all);
        localStorage.setItem("scala-demo", JSON.stringify(all));
      } else {
        const batch = writeBatch(db);
        batch.set(doc(db, "tasks", next.id), next);
        batch.set(doc(collection(db, "activityHistory")), {
          taskId: next.id,
          actor: session.uid,
          text: change,
          at: next.updatedAt,
        });
        await batch.commit();
      }
      setSelected(null);
      flash(change);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function commitImport(records: ImportRecord[]) {
    if (
      !session ||
      !["Administrator", "Manager", "Agency Editor"].includes(session.role)
    )
      throw Error("Your role cannot import activities.");
    if (demo) {
      const imported = records
        .filter((r) => r.collection === "tasks")
        .map((r) => r.data as Task);
      const next = [...tasks, ...imported];
      localStorage.setItem("scala-demo", JSON.stringify(next));
      for (const r of records.filter((r) => r.collection !== "tasks"))
        await catalog.save(
          r.collection as "projects" | "campaigns",
          r.data as import("./catalog").Plan,
        );
      setTasks(next);
    } else {
      const batch = writeBatch(db);
      for (const r of records) {
        batch.set(doc(db, r.collection, r.data.id), r.data);
        if (r.collection === "tasks") {
          const data = r.data as Task;
          batch.set(doc(collection(db, "activityHistory")), {
            taskId: data.id,
            actor: session.uid,
            text: "Imported activity",
            at: data.updatedAt,
          });
        }
      }
      await batch.commit();
    }
    flash(tr("Import completed"));
  }
  function newTask() {
    if (
      !session ||
      !["Administrator", "Manager", "Agency Editor"].includes(session.role)
    )
      return;
    setSelected({
      kind: "task",
      collaborators: [],
      channel: "Other",
      type: "Other",
      effort: 0,
      priority: "Medium",
      tags: [],
      updatedBy: session.uid,
      updatedAt: new Date().toISOString(),
      project: catalog.projects.find((p) => !p.archived)?.name || "",
      campaign: catalog.campaigns.find((p) => !p.archived)?.name || "",
      id: crypto.randomUUID(),
      title: "",
      description: "",
      assignee: session.name,
      start: today,
      end: today,
      status: "Planned",
      approval: "Not requested",
      progress: 0,
      dependencies: [],
      comments: [],
      history: [],
      attachments: [],
      checklist: [],
      createdBy: session.uid,
      createdAt: new Date().toISOString(),
    });
  }
  if (!ready)
    return (
      <div className="login">
        <p>{tr("Loading your workspace…")}</p>
      </div>
    );
  if (!session)
    return (
      <Login
        error={error}
        onDemo={() => {
          setDemo(true);
          setPeople(samplePeople);
          setSession({
            uid: "demo-admin",
            name: "Edgar Garcés",
            role: "Administrator",
          });
        }}
      />
    );
  const editable = ["Administrator", "Manager", "Agency Editor"].includes(
    session.role,
  );
  return (
    <div className="shell">
      <aside>
        <a className="brand" href="#" onClick={() => setView("Overview")}>
          {tr("scala")}
          <span>{tr("®")}</span>
        </a>
        <div className="workspace">
          <div className="workspace-icon">{tr("S")}</div>
          <div>
            <b>{tr("Scala Marketing")}</b>
            <small>{tr("Team workspace")}</small>
          </div>
          <ChevronRight size={15} />
        </div>
        <p className="nav-label">{tr("WORKSPACE")}</p>
        <nav>
          {tr(
            nav.map(([label, Icon]) => (
              <button
                className={view === label ? "active" : ""}
                key={label}
                onClick={() => setView(label)}
              >
                <Icon size={18} />
                {tr(label)}
                {tr(label === "Approvals" && <em>{tr(approval.length)}</em>)}
              </button>
            )),
          )}
        </nav>
        <div className="sidebar-projects">
          <p className="nav-label">
            {tr("PROJECTS ")}
            {["Administrator", "Manager"].includes(session.role) && (
              <button
                className="project-add"
                aria-label={tr("Add project")}
                onClick={() => {
                  setView("Projects");
                  setProjectRequest((n) => n + 1);
                }}
              >
                <Plus size={14} />
              </button>
            )}
          </p>
          {catalog.projects
            .filter((p) => !p.archived)
            .map((project) => (
              <button
                key={project.id}
                onClick={() => {
                  setSearch(project.name);
                  setView("Timeline");
                }}
              >
                <i />
                {project.name}
              </button>
            ))}
          <small>
            {catalog.projects.filter((p) => !p.archived).length}{" "}
            {tr("Projects")}
          </small>
        </div>
        <div className="sidebar-bottom">
          <div className="tip">
            <span>{tr("One team. Clear direction.")}</span>
            <p>{tr("Your next big thing starts with a good plan.")}</p>
            <ArrowUpRight size={18} />
          </div>
          <button onClick={() => setView("Settings")}>
            <Settings size={17} />
            {tr("Workspace settings")}
          </button>
          <div className="profile">
            <div className="avatar">
              {session.name
                .split(" ")
                .map((s) => s[0])
                .join("")
                .slice(0, 2)}
            </div>
            <div>
              <b>{tr(session.name)}</b>
              <small>{tr(session.role)}</small>
            </div>
            <button
              aria-label={tr("Log out")}
              onClick={() => {
                if (demo) {
                  setSession(null);
                  setDemo(false);
                } else void signOut(auth);
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      <main>
        <header>
          <div className="breadcrumb">
            {tr("Workspace ")}
            <ChevronRight size={14} />
            <strong>{tr(view)}</strong>
          </div>
          <div className="header-actions">
            <LanguageToggle />
            <span className="live">
              <i />
              {tr(demo ? "Local demo" : "Connected workspace")}
            </span>
            <button
              aria-label={tr("Notifications")}
              className="bell"
              onClick={() => setNotify(!notify)}
            >
              <Bell size={19} />
              <i />
            </button>
            <div className="avatar small">
              {session.name
                .split(" ")
                .map((s) => s[0])
                .join("")
                .slice(0, 2)}
            </div>
          </div>
        </header>
        <div className="content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">{tr("MARKETING COMMAND CENTER")}</p>
              <h1>
                {tr(
                  view === "Overview"
                    ? session.name === "Edgar Garcés"
                      ? "Good morning, Edgar"
                      : `${language === "es" ? "Hola" : "Good morning"}, ${session.name.split(" ")[0]}`
                    : view === "Timeline"
                      ? "Campaign timeline"
                      : view === "All activities"
                        ? "All activities"
                        : view,
                )}
              </h1>
              <p>
                {tr(
                  view === "Overview"
                    ? "A clear picture of what’s moving, what’s next, and what needs you."
                    : "Plan together. Keep every deliverable moving forward.",
                )}
              </p>
            </div>
            {tr(
              editable && (
                <>
                  <button
                    onClick={() => setImportOpen(true)}
                    className="import-trigger"
                  >
                    {tr("Bulk import")}
                  </button>
                  <button className="primary new-activity" onClick={newTask}>
                    <Plus size={17} />
                    {tr("New activity")}
                  </button>
                </>
              ),
            )}
          </div>
          {tr(
            demo && (
              <div className="demo-note">
                {tr("LOCAL PREVIEW ")}
                <span>
                  {tr(
                    "Explore the sample campaign. Changes are saved in this browser. Connect Firebase for team collaboration.",
                  )}
                </span>
              </div>
            ),
          )}
          {tr(
            view === "Overview" ? (
              <>
                <div className="stats">
                  {tr(
                    [
                      [
                        "Due this week",
                        tasks.filter(
                          (t) =>
                            t.end >= today &&
                            t.end <=
                              new Date(Date.now() + 604800000)
                                .toISOString()
                                .slice(0, 10),
                        ).length,
                        "Across your campaign",
                        "blue",
                      ],
                      [
                        "In progress",
                        tasks.filter((t) => t.status === "In progress").length,
                        "Work is moving forward",
                        "purple",
                      ],
                      [
                        "Awaiting approval",
                        approval.length,
                        "Ready for your feedback",
                        "amber",
                      ],
                      [
                        "Overdue activities",
                        overdue.length,
                        "Let’s get these back on track",
                        "red",
                      ],
                    ].map(([label, note, sub, color]) => (
                      <button
                        className={"stat " + color}
                        key={label}
                        onClick={() => {
                          setView("All activities");
                          setStatus(
                            label === "In progress"
                              ? "In progress"
                              : label === "Awaiting approval"
                                ? "Waiting for review"
                                : "",
                          );
                          setSearch("");
                          setPerson("");
                          setPriority("");
                          setTimeFilter(
                            label === "Overdue activities"
                              ? "Overdue"
                              : label === "Due this week"
                                ? "Due this week"
                                : "",
                          );
                        }}
                      >
                        <div>
                          {tr(label)}
                          <ArrowUpRight size={16} />
                        </div>
                        <strong>{tr(note)}</strong>
                        <small>
                          <i />
                          {tr(sub)}
                        </small>
                      </button>
                    )),
                  )}
                </div>
                <div className="dashboard-grid">
                  {demo ? (
                    <section className="panel campaign">
                      <div className="panel-title">
                        <h2>{tr("Active campaign")}</h2>
                        <span className="pill blue">{tr("In progress")}</span>
                      </div>
                      <p className="eyebrow">{tr("WEBINAR · OCTOBER 2026")}</p>
                      <h2>
                        {tr("What should your business ")}
                        <br />
                        {tr("automate first?")}
                      </h2>
                      <p>
                        {tr(
                          "From first idea to live webinar. Every detail, in one place.",
                        )}
                      </p>
                      <div className="campaign-meta">
                        <span>
                          <CalendarDays size={16} />
                          {tr(" Oct 24 · 11:00 AM Pacific")}
                        </span>
                        <div className="avatar-stack">
                          {tr(
                            people.slice(0, 3).map((x) => (
                              <div className="avatar small" key={x} title={x}>
                                {x
                                  .split(" ")
                                  .map((part) => part[0])
                                  .join("")
                                  .slice(0, 2)}
                              </div>
                            )),
                          )}
                        </div>
                      </div>
                      <div className="progress-label">
                        <span>{tr("Campaign progress")}</span>
                        <b>
                          {tr(
                            Math.round(
                              tasks.reduce((a, t) => a + t.progress, 0) /
                                (tasks.length || 1),
                            ),
                          )}
                          {tr("%")}
                        </b>
                      </div>
                      <div className="progress">
                        <i
                          style={{
                            width: `${tasks.reduce((a, t) => a + t.progress, 0) / (tasks.length || 1)}%`,
                          }}
                        />
                      </div>
                      <div className="campaign-footer">
                        <span>
                          {tr(
                            tasks.filter((t) => t.status === "Completed")
                              .length,
                          )}
                          {tr(" of ")}
                          {tr(tasks.length)}
                          {tr(" activities completed")}
                        </span>
                        <button onClick={() => setView("Timeline")}>
                          {tr("View timeline ")}
                          <ArrowUpRight size={16} />
                        </button>
                      </div>
                    </section>
                  ) : (
                    <section className="panel campaign">
                      <div className="panel-title">
                        <h2>{tr("Active project")}</h2>
                      </div>
                      {catalog.projects.find((p) => !p.archived) ? (
                        (() => {
                          const project = catalog.projects.find(
                            (p) => !p.archived,
                          )!;
                          const work = tasks.filter(
                            (t) => t.project === project.name,
                          );
                          const progress = Math.round(
                            work.reduce((n, t) => n + t.progress, 0) /
                              (work.length || 1),
                          );
                          return (
                            <>
                              <h2>{project.name}</h2>
                              <p>{project.description}</p>
                              <p>
                                {date(project.start)} — {date(project.end)}
                              </p>
                              <div className="progress-label">
                                <span>{tr("Campaign progress")}</span>
                                <b>{progress}%</b>
                              </div>
                              <div className="progress">
                                <i style={{ width: `${progress}%` }} />
                              </div>
                              <div className="campaign-footer">
                                <span>
                                  {
                                    work.filter((t) => t.status === "Completed")
                                      .length
                                  }{" "}
                                  / {work.length} {tr("activities completed")}
                                </span>
                                <button
                                  onClick={() => {
                                    setSearch(project.name);
                                    setView("Timeline");
                                  }}
                                >
                                  {tr("View timeline")}{" "}
                                  <ArrowUpRight size={16} />
                                </button>
                              </div>
                            </>
                          );
                        })()
                      ) : (
                        <>
                          <h2>{tr("Your workspace is ready")}</h2>
                          <p>
                            {tr(
                              "Create your first project, or import a plan to get started.",
                            )}
                          </p>
                          {["Administrator", "Manager"].includes(
                            session.role,
                          ) && (
                            <button
                              className="primary"
                              onClick={() => {
                                setView("Projects");
                                setProjectRequest((n) => n + 1);
                              }}
                            >
                              <Plus size={16} />
                              {tr("New project")}
                            </button>
                          )}
                        </>
                      )}
                    </section>
                  )}
                  <section className="panel attention">
                    <div className="panel-title">
                      <h2>{tr("Needs your attention")}</h2>
                      <span className="count">
                        {tr(
                          approval.length +
                            tasks.filter((t) => t.status === "Blocked").length,
                        )}
                      </span>
                    </div>
                    <div className="attention-item">
                      <span className="notice-icon amber">
                        <CheckCheck size={18} />
                      </span>
                      <div>
                        <b>
                          {tr(approval.length)}
                          {tr(" deliverable awaiting approval")}
                        </b>
                        <p>{tr("Help the team move to the next step.")}</p>
                        <button onClick={() => setView("Approvals")}>
                          {tr("Review deliverables ")}
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="attention-item">
                      <span className="notice-icon red">
                        <Flag size={18} />
                      </span>
                      <div>
                        <b>
                          {tr(
                            tasks.filter((t) => t.status === "Blocked").length,
                          )}
                          {tr(" activity is blocked")}
                        </b>
                        <p>
                          {tr(
                            tasks.find((t) => t.status === "Blocked")?.title ||
                              "No blocked activities.",
                          )}
                        </p>
                        <button
                          onClick={() =>
                            setSelected(
                              tasks.find((t) => t.status === "Blocked") || null,
                            )
                          }
                        >
                          {tr("See what’s blocking ")}
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="notice-bottom">
                      <i />
                      {tr("You’re all caught up on team mentions.")}
                    </div>
                  </section>
                  <section className="panel deadlines">
                    <div className="panel-title">
                      <div>
                        <h2>{tr("Upcoming activities")}</h2>
                        <p>
                          {tr("The next steps toward a successful launch.")}
                        </p>
                      </div>
                      <button onClick={() => setView("All activities")}>
                        {tr("View all ")}
                        <ArrowUpRight size={15} />
                      </button>
                    </div>
                    <TaskTable
                      tasks={tasks
                        .filter(
                          (t) =>
                            !["Completed", "Cancelled"].includes(t.status) &&
                            t.end >= today,
                        )
                        .sort((a, b) => a.end.localeCompare(b.end))
                        .slice(0, 6)}
                      open={setSelected}
                      date={date}
                    />
                  </section>
                  <section className="panel team">
                    <div className="panel-title">
                      <h2>{tr("Team workload")}</h2>
                      <button
                        onClick={() => setView("Workload")}
                        aria-label={tr("View workload")}
                      >
                        <ArrowUpRight size={17} />
                      </button>
                    </div>
                    <p>{tr("Estimated effort · current campaign")}</p>
                    {tr(
                      people.map((p, i) => {
                        const count = tasks.filter(
                          (t) => t.assignee === p && t.status !== "Completed",
                        );
                        return (
                          <div className="person" key={p}>
                            <div className={"avatar a" + i}>
                              {tr(
                                p
                                  .split(" ")
                                  .map((x) => x[0])
                                  .join(""),
                              )}
                            </div>
                            <div>
                              <b>{p}</b>
                              <small>
                                {tr(count.length)}
                                {tr(" activities · ")}
                                {tr(count.reduce((n, t) => n + t.effort, 0))}
                                {tr("h estimated")}
                              </small>
                              <div className="progress">
                                <i
                                  style={{
                                    width: `${Math.min(100, count.length * 15)}%`,
                                    background: [
                                      "#0866F1",
                                      "#8668dc",
                                      "#23a499",
                                    ][i],
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      }),
                    )}
                    <div className="team-footer">
                      <Users size={15} />
                      {tr(" Better plans start with balanced teams.")}
                    </div>
                  </section>
                </div>
              </>
            ) : view === "Projects" ? (
              <Catalog
                catalog={catalog}
                createRequest={projectRequest}
                editable={["Administrator", "Manager"].includes(session.role)}
                onOpen={(name) => {
                  setSearch(name);
                  setView("All activities");
                }}
              />
            ) : view === "Settings" ? (
              <section className="panel settings">
                <h2>{tr("Workspace settings")}</h2>
                <label>
                  {tr("Your timezone")}
                  <select
                    value={timezone}
                    onChange={(e) => {
                      setTimezone(e.target.value);
                      localStorage.setItem("scala-timezone", e.target.value);
                    }}
                  >
                    {tr(
                      [
                        "America/Guayaquil",
                        "America/Los_Angeles",
                        "America/New_York",
                        "Europe/Madrid",
                        "UTC",
                      ].map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      )),
                    )}
                  </select>
                </label>
                {tr(
                  session.role === "Administrator" && (
                    <>
                      <label>
                        {tr("Weekly capacity (hours)")}
                        <input
                          type="number"
                          min="1"
                          value={capacity}
                          onChange={(e) => setCapacity(+e.target.value)}
                        />
                      </label>
                      <label>
                        {tr("Statuses (comma separated)")}
                        <input
                          value={custom.join(", ")}
                          onChange={(e) =>
                            setCustom(
                              e.target.value.split(",").map((x) => x.trim()),
                            )
                          }
                        />
                      </label>
                      {tr(
                        (["priorities", "channels", "types"] as const).map(
                          (key) => (
                            <label key={key}>
                              {tr(key[0].toUpperCase() + key.slice(1))}
                              {tr(" (comma separated)")}
                              <input
                                value={taxonomy[key].join(", ")}
                                onChange={(e) =>
                                  setTaxonomy({
                                    ...taxonomy,
                                    [key]: e.target.value
                                      .split(",")
                                      .map((x) => x.trim()),
                                  })
                                }
                              />
                            </label>
                          ),
                        ),
                      )}
                      <button
                        className="primary"
                        onClick={async () => {
                          try {
                            if (!demo)
                              await setDoc(doc(db, "settings", "workspace"), {
                                statuses: custom,
                                ...taxonomy,
                                capacity,
                              });
                            flash(tr("Workspace settings saved"));
                          } catch (e) {
                            setError((e as Error).message);
                          }
                        }}
                      >
                        {tr("Save settings")}
                      </button>
                      <p>
                        {tr(
                          "Team access is provisioned with the trusted administrator script. No public self-registration.",
                        )}
                      </p>
                    </>
                  ),
                )}
              </section>
            ) : (
              <>
                <div className="toolbar">
                  <div className="search">
                    <Search size={16} />
                    <input
                      aria-label={tr("Search activities")}
                      placeholder={tr("Search activities…")}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <select
                    aria-label={tr("Status filter")}
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="">{tr("All statuses")}</option>
                    {tr(
                      custom.map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      )),
                    )}
                  </select>
                  <select
                    aria-label={tr("Person filter")}
                    value={person}
                    onChange={(e) => setPerson(e.target.value)}
                  >
                    <option value="">{tr("Everyone")}</option>
                    {tr(
                      people.map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      )),
                    )}
                  </select>
                  <select
                    aria-label={tr("Priority filter")}
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                  >
                    <option value="">{tr("All priorities")}</option>
                    {tr(
                      priorities.map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      )),
                    )}
                  </select>
                  <select
                    aria-label={tr("Activity filter")}
                    value={timeFilter}
                    onChange={(e) => setTimeFilter(e.target.value)}
                  >
                    <option value="">{tr("All dates and activities")}</option>
                    {[
                      "Due today",
                      "Due this week",
                      "Overdue",
                      "Unassigned",
                      "With attachments",
                      "Blocked",
                    ].map((v) => (
                      <option key={v} value={v}>
                        {tr(v)}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      setSearch("");
                      setStatus("");
                      setPerson("");
                      setPriority("");
                      setTimeFilter("");
                    }}
                  >
                    {tr("Clear")}
                  </button>
                  <button
                    onClick={() => {
                      const name = prompt(tr("Name this filter"));
                      if (name) {
                        const all = [
                          ...saved,
                          {
                            name,
                            search,
                            status,
                            person,
                            priority,
                          },
                        ];
                        setSaved(all);
                        localStorage.setItem(
                          "scala-filters",
                          JSON.stringify(all),
                        );
                        flash(tr("Filter saved"));
                      }
                    }}
                  >
                    <SlidersHorizontal size={16} />
                    {tr("Save filter")}
                  </button>
                  {tr(
                    saved.length > 0 && (
                      <select
                        aria-label={tr("Saved filters")}
                        onChange={(e) => {
                          const f = saved[+e.target.value];
                          if (f) {
                            setSearch(f.search);
                            setStatus(f.status);
                            setPerson(f.person);
                            setPriority(f.priority);
                          }
                        }}
                      >
                        <option value="">{tr("Saved filters")}</option>
                        {tr(
                          saved.map((f, i) => (
                            <option key={i} value={i}>
                              {tr(f.name)}
                            </option>
                          )),
                        )}
                      </select>
                    ),
                  )}
                </div>
                {tr(
                  view === "Timeline" ? (
                    <Timeline
                      tasks={filtered}
                      open={setSelected}
                    />
                  ) : view === "Board" ? (
                    <Board
                      tasks={filtered}
                      open={setSelected}
                      save={save}
                      edit={editable}
                      statuses={custom}
                    />
                  ) : view === "Calendar" ? (
                    <Calendar
                      tasks={filtered}
                      open={setSelected}
                      timezone={timezone}
                    />
                  ) : view === "Workload" ? (
                    <div className="workload">
                      {tr(
                        people.map((p) => (
                          <section className="panel" key={p}>
                            <h2>{tr(p)}</h2>
                            <p>
                              {tr(
                                filtered
                                  .filter((t) => t.assignee === p)
                                  .reduce((a, t) => a + t.effort, 0),
                              )}
                              {tr(" estimated hours")}
                            </p>
                            {tr(
                              filtered
                                .filter((t) => t.assignee === p)
                                .map((t) => (
                                  <button
                                    className="work-task"
                                    key={t.id}
                                    onClick={() => setSelected(t)}
                                  >
                                    {tr(t.title)}
                                    <span>
                                      {tr(date(t.end))}
                                      {tr(" · ")}
                                      {tr(t.effort)}
                                      {tr("h")}
                                    </span>
                                  </button>
                                )),
                            )}
                          </section>
                        )),
                      )}
                      <section className="panel">
                        <h2>{tr("Schedule warnings")}</h2>
                        {tr(
                          warnings.length ? (
                            warnings.map((w, i) => <p key={i}>{tr(w.text)}</p>)
                          ) : (
                            <p>{tr("No conflicts detected.")}</p>
                          ),
                        )}
                      </section>
                    </div>
                  ) : view === "Approvals" ? (
                    <section className="panel">
                      <h2>{tr("Ready for a second pair of eyes")}</h2>
                      <TaskTable
                        tasks={filtered.filter(
                          (t) => t.status === "Waiting for review",
                        )}
                        open={setSelected}
                        date={date}
                      />
                    </section>
                  ) : (
                    <ActivityList
                      people={people}
                      tasks={filtered}
                      open={setSelected}
                      date={date}
                      save={save}
                      edit={editable}
                    />
                  ),
                )}
                <p className="view-footer">
                  {tr(filtered.length)}
                  {tr(" activities · Dates shown in ")}
                  {tr(timezone)}
                </p>
              </>
            ),
          )}
          <footer>
            {tr("SCALA ")}
            <span>{tr("Make room for what’s next.")}</span>
            <small>{tr("Marketing workspace · 2026")}</small>
          </footer>
        </div>
      </main>
      {importOpen && (
        <BulkImport
          options={{
            uid: session.uid,
            name: session.name,
            role: session.role,
            people,
            projects: catalog.projects,
            campaigns: catalog.campaigns,
            tasks,
            statuses: custom,
            ...taxonomy,
            timezone,
          }}
          onCommit={commitImport}
          onClose={() => setImportOpen(false)}
        />
      )}
      {tr(
        selected && (
          <TaskPanel
            task={selected}
            tasks={tasks}
            close={() => setSelected(null)}
            save={save}
            editable={canEdit(session.role, selected, session.name)}
            approver={["Administrator", "Manager"].includes(session.role)}
            name={session.name}
            demo={demo}
            statuses={custom}
            taxonomy={taxonomy}
            catalog={catalog}
            people={people}
          />
        ),
      )}
      {tr(
        notify && (
          <div className="notifications panel">
            <div className="panel-title">
              <h2>{tr("Notifications")}</h2>
              <button
                onClick={() => setNotify(false)}
                aria-label={tr("Close notifications")}
              >
                <X size={18} />
              </button>
            </div>
            {tr(
              [
                ...overdue.map((t) => ({
                  task: t,
                  text: `Overdue: ${t.title}`,
                })),
                ...approval.map((t) => ({
                  task: t,
                  text: `Approval requested: ${t.title}`,
                })),
                ...tasks
                  .filter((t) =>
                    t.comments.some((c) => c.text.includes("@" + session.name)),
                  )
                  .map((t) => ({
                    task: t,
                    text: `You were mentioned in ${t.title}`,
                  })),
              ].map((n, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setSelected(n.task);
                    setNotify(false);
                  }}
                >
                  {tr(n.text)}
                </button>
              )),
            )}
          </div>
        ),
      )}
      {tr(
        toast && (
          <div role="status" className="toast">
            <Check size={17} />
            {tr(toast)}
          </div>
        ),
      )}
      {tr(
        error && (
          <div role="alert" className="error-toast">
            {tr(error)}
            <button
              onClick={() => setError(tr(""))}
              aria-label={tr("Dismiss error")}
            >
              <X size={16} />
            </button>
          </div>
        ),
      )}
    </div>
  );
}
function Login({ onDemo, error }: { onDemo: () => void; error: string }) {
  const { t: tr } = useI18n();
  const [username, setUsername] = useState(""),
    [password, setPassword] = useState(""),
    [message, setMessage] = useState(error),
    [busy, setBusy] = useState(false);
  return (
    <div className="login">
      <div className="login-language">
        <LanguageToggle />
      </div>
      <div className="login-brand">
        {tr("scala®")}
        <p>
          {tr("A little structure.")}
          <br />
          {tr("A lot of possibility.")}
        </p>
        <small>{tr("Your marketing team’s shared command center.")}</small>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await signInWithEmailAndPassword(
              auth,
              usernameEmail(username),
              password,
            );
          } catch (e) {
            setMessage((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <p className="eyebrow">{tr("WELCOME TO YOUR WORKSPACE")}</p>
        <h1>{tr("Let’s move things forward.")}</h1>
        <p>{tr("Sign in to Scala Marketing.")}</p>
        <label>
          {tr("Username")}
          <input
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
          />
        </label>
        <label>
          {tr("Password")}
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        <button className="primary" disabled={busy || !configured}>
          {tr(busy ? "Signing in…" : "Sign in")}
        </button>
        <p className="login-note">
          {tr(
            "Accounts and password resets are managed by your administrator through the terminal.",
          )}
        </p>
        {demoEnabled && (
          <>
            <hr />
            <button type="button" className="demo-button" onClick={onDemo}>
              {tr("Explore the local demo ")}
              <ArrowUpRight size={16} />
            </button>
            <small>{tr("Sample data · no account required")}</small>
          </>
        )}
        {tr(
          !configured && (
            <p className="login-note">
              {tr(
                "Firebase isn’t configured yet. Use the local demo, or follow the README to connect the emulators.",
              )}
            </p>
          ),
        )}
        {tr((message || error) && <p role="alert">{tr(message || error)}</p>)}
      </form>
    </div>
  );
}
function TaskTable({
  tasks,
  open,
  date,
  selection,
}: {
  tasks: Task[];
  open: (t: Task) => void;
  date: (s: string) => string;
  selection?: {
    chosen: string[];
    toggle: (id: string) => void;
  };
}) {
  const { t: tr } = useI18n();
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {tr(selection && <th aria-label={tr("Select activity")} />)}
            <th>{tr("ACTIVITY")}</th>
            <th>{tr("ASSIGNEE")}</th>
            <th>{tr("DUE DATE")}</th>
            <th>{tr("STATUS")}</th>
          </tr>
        </thead>
        <tbody>
          {tr(
            tasks.map((t) => (
              <tr key={t.id}>
                {tr(
                  selection && (
                    <td>
                      <input
                        type="checkbox"
                        aria-label={tr(`Select ${t.title}`)}
                        checked={selection.chosen.includes(t.id)}
                        onChange={() => selection.toggle(t.id)}
                      />
                    </td>
                  ),
                )}
                <td>
                  <button onClick={() => open(t)}>
                    <span className={"task-dot " + t.priority.toLowerCase()} />
                    {tr(t.title)}
                  </button>
                  <small>{tr(t.channel)}</small>
                </td>
                <td>
                  <span className="initial">
                    {tr(
                      t.assignee
                        .split(" ")
                        .map((s) => s[0])
                        .join("") || "—",
                    )}
                  </span>
                </td>
                <td>{tr(date(t.end))}</td>
                <td>
                  <span
                    className={
                      "pill " + t.status.toLowerCase().replaceAll(" ", "-")
                    }
                  >
                    {tr(t.status)}
                  </span>
                </td>
              </tr>
            )),
          )}
        </tbody>
      </table>
      {tr(
        !tasks.length && (
          <p className="empty">
            {tr(
              "No activities here. Adjust your filters or create an activity.",
            )}
          </p>
        ),
      )}
    </div>
  );
}
function Board({
  tasks,
  open,
  save,
  edit,
  statuses: columns,
}: {
  tasks: Task[];
  open: (t: Task) => void;
  save: (t: Task, s: string) => void;
  edit: boolean;
  statuses: string[];
}) {
  const { t: tr } = useI18n();
  const [group, setGroup] = useState("status");
  const groups =
    group === "status"
      ? columns
      : [...new Set(tasks.map((t) => t[group as keyof Task] as string))];
  return (
    <>
      <label>
        {tr("Group by ")}
        <select value={group} onChange={(e) => setGroup(e.target.value)}>
          {tr(
            ["status", "assignee", "campaign", "priority", "type"].map((x) => (
              <option key={x} value={x}>
                {tr(x)}
              </option>
            )),
          )}
        </select>
      </label>
      <div className="board">
        {tr(
          groups.map((s) => (
            <section
              key={s}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const t = tasks.find(
                  (t) => t.id === e.dataTransfer.getData("text/plain"),
                );
                if (t && edit && group === "status")
                  save(
                    {
                      ...t,
                      status: s,
                      progress: s === "Completed" ? 100 : t.progress,
                    },
                    `Status changed to ${s}`,
                  );
              }}
            >
              <h3>
                {tr(s)}
                <span>
                  {tr(tasks.filter((t) => t[group as keyof Task] === s).length)}
                </span>
              </h3>
              {tr(
                tasks
                  .filter((t) => t[group as keyof Task] === s)
                  .map((t) => (
                    <button
                      className="board-card"
                      key={t.id}
                      draggable={edit && group === "status"}
                      onDragStart={(e) =>
                        e.dataTransfer.setData("text/plain", t.id)
                      }
                      onClick={() => open(t)}
                    >
                      <small>{tr(t.channel)}</small>
                      <b>{tr(t.title)}</b>
                      <span>
                        {tr(t.assignee)}
                        {tr(" · ")}
                        {tr(t.end.slice(5))}
                      </span>
                      <span className={"pill " + t.priority.toLowerCase()}>
                        {tr(t.priority)}
                      </span>
                    </button>
                  )),
              )}
            </section>
          )),
        )}
      </div>
    </>
  );
}
function Calendar({
  tasks,
  open,
  timezone,
}: {
  tasks: Task[];
  open: (t: Task) => void;
  timezone: string;
}) {
  const { t: tr, language } = useI18n();
  const eventDay = (value: string) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(value));
  const scheduledTasks = tasks.map((t) =>
    t.startAt
      ? {
          ...t,
          start: eventDay(t.startAt),
          end: eventDay(t.endAt || t.startAt),
        }
      : t,
  );
  const eventTime = (t: Task) =>
    t.startAt
      ? new Intl.DateTimeFormat(language === "es" ? "es-EC" : "en-US", {
          timeZone: timezone,
          hour: "numeric",
          minute: "2-digit",
        }).format(new Date(t.startAt))
      : "";
  const [month, setMonth] = useState(new Date(2026, 9, 1)),
    [mode, setMode] = useState("Month"),
    [week, setWeek] = useState(0);
  const year = month.getFullYear(),
    mo = month.getMonth();
  const days = Array.from(
    {
      length: 42,
    },
    (_, i) => new Date(year, mo, i - month.getDay() + 1),
  );
  return (
    <section className="panel">
      <div className="panel-title">
        <button
          aria-label={tr("Previous month")}
          onClick={() =>
            mode === "Week"
              ? setWeek((w) => w - 1)
              : setMonth(new Date(year, mo - 1, 1))
          }
        >
          <ChevronLeft />
        </button>
        <h2>
          {tr(
            month.toLocaleDateString(language === "es" ? "es-EC" : "en-US", {
              month: "long",
              year: "numeric",
            }),
          )}
        </h2>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          aria-label={tr("Calendar view")}
        >
          <option value={"Month"}>{tr("Month")}</option>
          <option value={"Week"}>{tr("Week")}</option>
          <option value={"Agenda"}>{tr("Agenda")}</option>
        </select>
        <button
          aria-label={tr("Next month")}
          onClick={() =>
            mode === "Week"
              ? setWeek((w) => w + 1)
              : setMonth(new Date(year, mo + 1, 1))
          }
        >
          <ChevronRight />
        </button>
      </div>
      {tr(
        mode === "Agenda" ? (
          scheduledTasks
            .filter((t) => new Date(t.end + "T12:00:00").getMonth() === mo)
            .map((t) => (
              <button className="work-task" onClick={() => open(t)} key={t.id}>
                {tr(t.end)}
                {tr(" · ")}
                {t.kind === "milestone" ? "◈ " : t.kind === "event" ? "◷ " : ""}
                {eventTime(t)} {tr(t.title)}
              </button>
            ))
        ) : (
          <div className="calendar">
            {tr(
              ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <b key={d}>{tr(d)}</b>
              )),
            )}
            {tr(
              (mode === "Week"
                ? Array.from(
                    {
                      length: 7,
                    },
                    (_, i) =>
                      new Date(year, mo, 1 - month.getDay() + week * 7 + i),
                  )
                : days
              ).map((d) => {
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
                return (
                  <div className={d.getMonth() !== mo ? "muted" : ""} key={key}>
                    <span>{tr(d.getDate())}</span>
                    {tr(
                      scheduledTasks
                        .filter((t) => t.end === key || t.start === key)
                        .map((t) => (
                          <button key={t.id} onClick={() => open(t)}>
                            {tr(t.start === key ? "↗" : "⚑")}{" "}
                            {t.kind === "milestone"
                              ? "◈ "
                              : t.kind === "event"
                                ? "◷ "
                                : ""}
                            {eventTime(t)} {tr(t.title)}
                          </button>
                        )),
                    )}
                  </div>
                );
              }),
            )}
          </div>
        ),
      )}
    </section>
  );
}
function ActivityList({
  people,
  tasks,
  open,
  date,
  save,
  edit,
}: {
  people: string[];
  tasks: Task[];
  open: (t: Task) => void;
  date: (s: string) => string;
  save: (t: Task, s: string) => void;
  edit: boolean;
}) {
  const { t: tr } = useI18n();
  const [sort, setSort] = useState("end"),
    [chosen, setChosen] = useState<string[]>([]);
  return (
    <section className="panel">
      <div className="panel-title">
        <select
          aria-label={tr("Sort activities")}
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="end">{tr("Sort by due date")}</option>
          <option value="title">{tr("Sort by title")}</option>
          <option value="assignee">{tr("Sort by assignee")}</option>
          <option value="status">{tr("Sort by status")}</option>
        </select>
        <button
          onClick={() => {
            const csv = [
              "Title,Assignee,Start,Due,Status,Priority",
              ...tasks.map((t) =>
                [t.title, t.assignee, t.start, t.end, t.status, t.priority]
                  .map(
                    (s) =>
                      '"' +
                      String(s)
                        .replaceAll('"', '""')
                        .replace(/^[=+\-@]/, "'$&") +
                      '"',
                  )
                  .join(","),
              ),
            ].join("\n");
            const url = URL.createObjectURL(
              new Blob([csv], {
                type: "text/csv",
              }),
            );
            const a = document.createElement("a");
            a.href = url;
            a.download = "scala-activities.csv";
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          <Download size={16} />
          {tr("Export CSV")}
        </button>
      </div>
      {tr(
        edit && (
          <div className="bulk">
            <label>
              <input
                type="checkbox"
                checked={!!tasks.length && chosen.length === tasks.length}
                onChange={(e) =>
                  setChosen(e.target.checked ? tasks.map((t) => t.id) : [])
                }
              />
              {tr(" Select all (")}
              {tr(chosen.length)}
              {tr(")")}
            </label>
            <select
              aria-label={tr("Bulk status")}
              defaultValue=""
              onChange={(e) => {
                if (
                  e.target.value &&
                  confirm(`Update ${chosen.length} activities?`)
                )
                  tasks
                    .filter((t) => chosen.includes(t.id))
                    .forEach((t) =>
                      save(
                        {
                          ...t,
                          status: e.target.value,
                          progress:
                            e.target.value === "Completed" ? 100 : t.progress,
                        },
                        "Bulk status update",
                      ),
                    );
              }}
            >
              <option value="">{tr("Change status…")}</option>
              {tr(
                statuses.map((s) => (
                  <option key={s} value={s}>
                    {tr(s)}
                  </option>
                )),
              )}
            </select>
            <select
              aria-label={tr("Bulk assignment")}
              defaultValue=""
              onChange={(e) => {
                if (
                  e.target.value &&
                  confirm(`Assign ${chosen.length} activities?`)
                )
                  tasks
                    .filter((t) => chosen.includes(t.id))
                    .forEach((t) =>
                      save(
                        {
                          ...t,
                          assignee: e.target.value,
                        },
                        "Bulk assignment",
                      ),
                    );
              }}
            >
              <option value="">{tr("Assign to…")}</option>
              {tr(
                people.map((p) => (
                  <option key={p} value={p}>
                    {tr(p)}
                  </option>
                )),
              )}
            </select>
            <input
              aria-label={tr("Bulk due date")}
              type="date"
              onChange={(e) => {
                if (
                  e.target.value &&
                  confirm(`Change due date for ${chosen.length} activities?`)
                )
                  tasks
                    .filter((t) => chosen.includes(t.id))
                    .forEach((t) =>
                      save(
                        {
                          ...t,
                          end: e.target.value,
                        },
                        "Bulk due date update",
                      ),
                    );
              }}
            />
          </div>
        ),
      )}
      <TaskTable
        tasks={[...tasks].sort((a, b) =>
          String(a[sort as keyof Task]).localeCompare(
            String(b[sort as keyof Task]),
          ),
        )}
        open={open}
        date={date}
        selection={
          edit
            ? {
                chosen,
                toggle: (id) =>
                  setChosen((ids) =>
                    ids.includes(id)
                      ? ids.filter((x) => x !== id)
                      : [...ids, id],
                  ),
              }
            : undefined
        }
      />
    </section>
  );
}
function TaskPanel({
  task,
  tasks,
  close,
  save,
  editable,
  approver,
  name,
  demo,
  statuses: options,
  taxonomy,
  catalog,
  people,
}: {
  task: Task;
  tasks: Task[];
  close: () => void;
  save: (t: Task, s: string) => void;
  editable: boolean;
  approver: boolean;
  name: string;
  demo: boolean;
  statuses: string[];
  people: string[];
  catalog: ReturnType<typeof useCatalog>;
  taxonomy: {
    priorities: string[];
    channels: string[];
    types: string[];
  };
}) {
  const { t: tr } = useI18n();
  const [t, setT] = useState(structuredClone(task)),
    [comment, setComment] = useState(""),
    [tab, setTab] = useState("Details"),
    [upload, setUpload] = useState("");
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    panel.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab") {
        const nodes = panel.current?.querySelectorAll<HTMLElement>(
          'button,input,select,textarea,[tabindex="0"]',
        );
        if (nodes?.length) {
          const first = nodes[0],
            last = nodes[nodes.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, []);
  const field = (key: keyof Task, value: any) =>
    setT({
      ...t,
      [key]: value,
    });
  return (
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className={"task-panel " + (!editable ? "read-only" : "")}
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={tr("Activity details")}
      >
        <div className="panel-title">
          <span className="eyebrow">{tr("ACTIVITY DETAILS")}</span>
          <button onClick={close} aria-label={tr("Close details")}>
            <X />
          </button>
        </div>
        <h2>{tr(t.title || "Create a new activity")}</h2>
        <div className="tabs">
          {tr(
            ["Details", "Comments", "Files", "History"].map((s) => (
              <button
                className={tab === s ? "active" : ""}
                key={s}
                onClick={() => setTab(s)}
              >
                {tr(s)}
              </button>
            )),
          )}
        </div>
        <fieldset disabled={!editable}>
          {tr(
            tab === "Details" ? (
              <>
                <label>
                  {tr("Title")}
                  <input
                    value={t.title}
                    onChange={(e) => field("title", e.target.value)}
                  />
                </label>
                <label>
                  {tr("Record type")}
                  <select
                    aria-label={tr("Record type")}
                    value={t.kind || "task"}
                    onChange={(e) => field("kind", e.target.value)}
                  >
                    {["task", "event", "milestone"].map((kind) => (
                      <option key={kind} value={kind}>
                        {tr(kind)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {tr("Description")}
                  <textarea
                    rows={3}
                    value={t.description}
                    onChange={(e) => field("description", e.target.value)}
                  />
                </label>
                {t.kind === "event" && (
                  <div className="form-grid">
                    <label>
                      {tr("Event start (ISO with timezone)")}
                      <input
                        placeholder="2026-10-24T18:00:00Z"
                        value={t.startAt || ""}
                        onChange={(e) => field("startAt", e.target.value)}
                      />
                    </label>
                    <label>
                      {tr("Event end (ISO with timezone)")}
                      <input
                        placeholder="2026-10-24T19:00:00Z"
                        value={t.endAt || ""}
                        onChange={(e) => field("endAt", e.target.value)}
                      />
                    </label>
                  </div>
                )}
                <div className="form-grid">
                  {tr(
                    [
                      ["Status", "status", options],
                      ["Assignee", "assignee", ["", ...people]],
                      ["Priority", "priority", taxonomy.priorities],
                      ["Channel", "channel", taxonomy.channels],
                      ["Activity type", "type", taxonomy.types],
                    ].map(([label, key, values]) => (
                      <label key={key as string}>
                        {tr(label as string)}
                        <select
                          aria-label={tr(label as string)}
                          value={t[key as keyof Task] as string}
                          onChange={(e) =>
                            field(key as keyof Task, e.target.value)
                          }
                        >
                          {tr(
                            (values as string[]).map((s) => (
                              <option key={s} value={s}>
                                {tr(s)}
                              </option>
                            )),
                          )}
                        </select>
                      </label>
                    )),
                  )}
                  <label>
                    {tr("Project")}
                    <select
                      value={t.project}
                      onChange={(e) => field("project", e.target.value)}
                    >
                      <option value="">{tr("Select project")}</option>
                      {catalog.projects
                        .filter((p) => !p.archived)
                        .map((p) => (
                          <option key={p.id} value={p.name}>
                            {p.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    {tr("Campaign")}
                    <select
                      value={t.campaign}
                      onChange={(e) => field("campaign", e.target.value)}
                    >
                      <option value="">{tr("Select campaign")}</option>
                      {catalog.campaigns
                        .filter((p) => !p.archived)
                        .map((p) => (
                          <option key={p.id} value={p.name}>
                            {p.name}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    {tr("Start date")}
                    <input
                      type="date"
                      value={t.start}
                      onChange={(e) => field("start", e.target.value)}
                    />
                  </label>
                  <label>
                    {tr("Due date")}
                    <input
                      type="date"
                      value={t.end}
                      onChange={(e) => field("end", e.target.value)}
                    />
                  </label>
                  <label>
                    {tr("Estimated effort (hours)")}
                    <input
                      type="number"
                      min="0"
                      value={t.effort}
                      onChange={(e) => field("effort", +e.target.value)}
                    />
                  </label>
                  <label>
                    {tr("Progress (%)")}
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={t.progress}
                      onChange={(e) => field("progress", +e.target.value)}
                    />
                  </label>
                  <label>
                    {tr("Tags")}
                    <input
                      value={t.tags.join(", ")}
                      onChange={(e) =>
                        field(
                          "tags",
                          e.target.value.split(",").map((s) => s.trim()),
                        )
                      }
                    />
                  </label>
                </div>
                <label>
                  {tr("Dependencies")}
                  <select
                    multiple
                    value={t.dependencies}
                    onChange={(e) =>
                      field(
                        "dependencies",
                        Array.from(e.target.selectedOptions, (x) => x.value),
                      )
                    }
                  >
                    {tr(
                      tasks
                        .filter((x) => x.id !== t.id)
                        .map((x) => (
                          <option key={x.id} value={x.id}>
                            {tr(x.title)}
                          </option>
                        )),
                    )}
                  </select>
                </label>
                <h3>{tr("Checklist")}</h3>
                {tr(
                  t.checklist.map((c, i) => (
                    <label className="checklist" key={i}>
                      <input
                        type="checkbox"
                        checked={c.done}
                        onChange={() =>
                          field(
                            "checklist",
                            t.checklist.map((x, j) =>
                              j === i
                                ? {
                                    ...x,
                                    done: !x.done,
                                  }
                                : x,
                            ),
                          )
                        }
                      />
                      {tr(c.text)}
                    </label>
                  )),
                )}
                <button
                  onClick={() => {
                    const text = prompt(tr("Checklist item"));
                    if (text)
                      field("checklist", [
                        ...t.checklist,
                        {
                          text,
                          done: false,
                        },
                      ]);
                  }}
                >
                  {tr("＋ Add checklist item")}
                </button>
                {tr(
                  conflicts([t, ...tasks.filter((x) => x.id !== t.id)])
                    .filter((w) => w.task === t.id)
                    .map((w, i) => (
                      <p className="warning" key={i}>
                        {tr(w.text)}
                      </p>
                    )),
                )}
              </>
            ) : tab === "Comments" ? (
              <>
                {tr(
                  t.comments.map((c, i) => (
                    <div className="comment" key={i}>
                      <b>{tr(c.author)}</b>
                      <small>{tr(new Date(c.at).toLocaleString())}</small>
                      <p>{tr(c.text)}</p>
                    </div>
                  )),
                )}
                <label>
                  {tr("Add a comment · use @Name to mention")}
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                </label>
                <button
                  onClick={() => {
                    if (comment.trim()) {
                      field("comments", [
                        ...t.comments,
                        {
                          text: comment,
                          author: name,
                          at: new Date().toISOString(),
                        },
                      ]);
                      setComment("");
                    }
                  }}
                >
                  {tr("Add comment to draft")}
                </button>
              </>
            ) : tab === "Files" ? (
              <>
                <label className="upload">
                  <Paperclip size={18} />
                  {tr(" Attach PDF, PNG, JPG or WebP (up to 10 MB)")}
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    disabled={demo || !attachmentsEnabled}
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      if (
                        f.size > 10485760 ||
                        ![
                          "application/pdf",
                          "image/png",
                          "image/jpeg",
                          "image/webp",
                        ].includes(f.type)
                      ) {
                        setUpload("Unsupported file or size over 10 MB.");
                        return;
                      }
                      try {
                        setUpload("Uploading…");
                        const r = ref(
                          storage,
                          `tasks/${t.id}/${crypto.randomUUID()}-${f.name}`,
                        );
                        await uploadBytes(r, f);
                        field("attachments", [
                          ...t.attachments,
                          {
                            name: f.name,
                            url: await getDownloadURL(r),
                          },
                        ]);
                        setUpload("Uploaded. Save the activity to attach it.");
                      } catch (e) {
                        setUpload((e as Error).message);
                      }
                    }}
                  />
                </label>
                <p>
                  {tr(
                    !attachmentsEnabled
                      ? "File attachments are not enabled for this workspace."
                      : demo
                        ? "Connect Firebase Storage to upload files."
                        : upload,
                  )}
                </p>
                {tr(
                  t.attachments.map((a) => (
                    <p key={a.url}>
                      <a href={a.url} target="_blank" rel="noreferrer">
                        {tr(a.name)}
                      </a>
                    </p>
                  )),
                )}
              </>
            ) : (
              <>
                {tr(
                  t.history.map((h, i) => (
                    <div className="comment" key={i}>
                      <b>{tr(h.text)}</b>
                      <p>
                        {tr(h.author)}
                        {tr(" · ")}
                        {tr(new Date(h.at).toLocaleString())}
                      </p>
                    </div>
                  )),
                )}
                {tr(
                  !t.history.length && <p>{tr("No changes recorded yet.")}</p>,
                )}
              </>
            ),
          )}
        </fieldset>
        {tr(
          editable && (
            <div className="panel-actions">
              <button onClick={close}>{tr("Cancel")}</button>
              <button
                className="primary"
                onClick={() => {
                  if (
                    (task.start !== t.start || task.end !== t.end) &&
                    !confirm(tr("Save this schedule change?"))
                  )
                    return;
                  save(t, `Updated activity: ${t.title}`);
                }}
              >
                {tr("Save activity")}
              </button>
            </div>
          ),
        )}
        {tr(
          approver && t.status === "Waiting for review" && (
            <div className="approval-actions">
              <button
                className="primary"
                onClick={() =>
                  save(
                    {
                      ...t,
                      status: "Approved",
                      approval: "Approved",
                    },
                    "Approved deliverable",
                  )
                }
              >
                {tr("Approve deliverable")}
              </button>
              <button
                onClick={() => {
                  const text = prompt(tr("Explain the changes needed"));
                  if (text)
                    save(
                      {
                        ...t,
                        status: "Changes requested",
                        approval: "Changes requested",
                        comments: [
                          ...t.comments,
                          {
                            text,
                            author: name,
                            at: new Date().toISOString(),
                          },
                        ],
                      },
                      "Requested changes",
                    );
                }}
              >
                {tr("Request changes")}
              </button>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </React.StrictMode>,
);
