import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { useI18n } from "./i18n";
export type Plan = {
  id: string;
  name: string;
  description: string;
  start: string;
  end: string;
  archived: boolean;
  projectId?: string;
};
export const initialProjects: Plan[] = [
  {
    id: "webinar",
    name: "Automation Webinar",
    description: "What Should Your Business Automate First? — Webinar Campaign",
    start: "2026-10-05",
    end: "2026-10-30",
    archived: false,
  },
];
export const initialCampaigns: Plan[] = [
  {
    id: "october",
    name: "October webinar launch",
    description: "Webinar registration and follow-up",
    projectId: "webinar",
    start: "2026-10-05",
    end: "2026-10-30",
    archived: false,
  },
];
export function useCatalog(demo: boolean, active: boolean) {
  const [projects, setProjects] = useState<Plan[]>(demo ? initialProjects : []),
    [campaigns, setCampaigns] = useState<Plan[]>(demo ? initialCampaigns : []);
  useEffect(() => {
    if (!active) return;
    if (demo) {
      setProjects(
        JSON.parse(localStorage.getItem("scala-projects") || "null") ||
          initialProjects,
      );
      setCampaigns(
        JSON.parse(localStorage.getItem("scala-campaigns") || "null") ||
          initialCampaigns,
      );
      return;
    }
    const off1 = onSnapshot(collection(db, "projects"), (s) =>
      setProjects(s.docs.map((d) => ({ id: d.id, ...d.data() }) as Plan)),
    );
    const off2 = onSnapshot(collection(db, "campaigns"), (s) =>
      setCampaigns(s.docs.map((d) => ({ id: d.id, ...d.data() }) as Plan)),
    );
    return () => {
      off1();
      off2();
    };
  }, [demo, active]);
  async function save(kind: "projects" | "campaigns", plan: Plan) {
    if (!plan.name.trim() || !plan.start || !plan.end || plan.start > plan.end)
      throw Error("Enter a name and a valid date range.");
    if (demo) {
      const all = kind === "projects" ? projects : campaigns;
      const next = all.some((p) => p.id === plan.id)
        ? all.map((p) => (p.id === plan.id ? plan : p))
        : [...all, plan];
      localStorage.setItem("scala-" + kind, JSON.stringify(next));
      (kind === "projects" ? setProjects : setCampaigns)(next);
    } else await setDoc(doc(db, kind, plan.id), plan);
  }
  return { projects, campaigns, save };
}
export function Catalog({
  catalog,
  editable,
  onOpen,
  createRequest = 0,
}: {
  catalog: ReturnType<typeof useCatalog>;
  editable: boolean;
  createRequest?: number;
  onOpen: (name: string) => void;
}) {
  const { t } = useI18n();
  const [kind, setKind] = useState<"projects" | "campaigns">("projects"),
    [draft, setDraft] = useState<Plan | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    if (createRequest && editable) {
      setKind("projects");
      setDraft({
        id: crypto.randomUUID(),
        name: "",
        description: "",
        start: new Date().toISOString().slice(0, 10),
        end: new Date().toISOString().slice(0, 10),
        archived: false,
      });
    }
  }, [createRequest, editable]);
  const list = catalog[kind];
  return (
    <section className="panel">
      <div className="panel-title">
        <div className="tabs">
          <button
            className={kind === "projects" ? "active" : ""}
            onClick={() => setKind("projects")}
          >
            {t("Projects")}
          </button>
          <button
            className={kind === "campaigns" ? "active" : ""}
            onClick={() => setKind("campaigns")}
          >
            {t("Campaigns")}
          </button>
        </div>
        {editable && (
          <button
            className="primary"
            onClick={() =>
              setDraft({
                id: crypto.randomUUID(),
                name: "",
                description: "",
                start: new Date().toISOString().slice(0, 10),
                end: new Date().toISOString().slice(0, 10),
                archived: false,
                ...(kind === "campaigns"
                  ? { projectId: catalog.projects[0]?.id || "" }
                  : {}),
              })
            }
          >
            {t(kind === "projects" ? "New project" : "New campaign")}
          </button>
        )}
      </div>
      {draft && (
        <form
          className="catalog-form"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await catalog.save(kind, draft);
              setDraft(null);
              setError("");
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          <label>
            {t("Name")}
            <input
              required
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </label>
          <label>
            {t("Description")}
            <textarea
              value={draft.description}
              onChange={(e) =>
                setDraft({ ...draft, description: e.target.value })
              }
            />
          </label>
          {kind === "campaigns" && (
            <label>
              {t("Project")}
              <select
                required
                value={draft.projectId}
                onChange={(e) =>
                  setDraft({ ...draft, projectId: e.target.value })
                }
              >
                {catalog.projects
                  .filter((p) => !p.archived)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </label>
          )}
          <div className="form-grid">
            <label>
              {t("Start date")}
              <input
                type="date"
                required
                value={draft.start}
                onChange={(e) => setDraft({ ...draft, start: e.target.value })}
              />
            </label>
            <label>
              {t("Due date")}
              <input
                type="date"
                required
                value={draft.end}
                onChange={(e) => setDraft({ ...draft, end: e.target.value })}
              />
            </label>
          </div>
          <button type="button" onClick={() => setDraft(null)}>
            {t("Cancel")}
          </button>
          <button className="primary">{t("Save")}</button>
        </form>
      )}
      {error && <p role="alert">{t(error)}</p>}
      <div className="catalog-grid">
        {list.map((p) => (
          <article key={p.id} className="catalog-card">
            <span className="pill">
              {t(p.archived ? "Archived" : "Active")}
            </span>
            <h2>{p.name}</h2>
            <p>{p.description}</p>
            <small>
              {p.start} → {p.end}
            </small>
            <div>
              <button onClick={() => onOpen(p.name)}>
                {t("View activities")} ↗
              </button>
              {editable && (
                <>
                  <button onClick={() => setDraft(p)}>{t("Edit")}</button>
                  <button
                    onClick={async () => {
                      if (
                        confirm(
                          t(
                            p.archived
                              ? "Restore this plan?"
                              : "Archive this plan? Activities will be kept.",
                          ),
                        )
                      )
                        try {
                          await catalog.save(kind, {
                            ...p,
                            archived: !p.archived,
                          });
                        } catch (e) {
                          setError((e as Error).message);
                        }
                    }}
                  >
                    {t(p.archived ? "Restore" : "Archive")}
                  </button>
                </>
              )}
            </div>
          </article>
        ))}
      </div>
      {!list.length && (
        <p className="empty">
          {t("Create a project to start planning your campaign.")}
        </p>
      )}
    </section>
  );
}
