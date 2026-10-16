import { useEffect, useRef, useState } from "react";
import { X, Upload, Download } from "lucide-react";
import {
  CSV_TEMPLATE,
  IMPORT_LIMIT,
  previewImport,
  type ImportOptions,
  type ImportRecord,
} from "./importer";
import { useI18n } from "./i18n";
export function BulkImport({
  options,
  onCommit,
  onClose,
}: {
  options: ImportOptions;
  onCommit: (records: ImportRecord[]) => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [text, setText] = useState(""),
    [format, setFormat] = useState<"csv" | "json">("csv"),
    [filename, setFilename] = useState(""),
    [preview, setPreview] = useState<ReturnType<typeof previewImport> | null>(
      null,
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    root.current?.focus();
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
      if (e.key === "Tab") {
        const nodes = root.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input:not(:disabled),[tabindex="0"]',
        );
        if (nodes?.length) {
          if (e.shiftKey && document.activeElement === nodes[0]) {
            e.preventDefault();
            nodes[nodes.length - 1].focus();
          } else if (
            !e.shiftKey &&
            document.activeElement === nodes[nodes.length - 1]
          ) {
            e.preventDefault();
            nodes[0].focus();
          }
        }
      }
    };
    document.addEventListener("keydown", handle);
    return () => {
      document.removeEventListener("keydown", handle);
      previous?.focus();
    };
  }, [busy, onClose]);
  async function load(file: File) {
    setError("");
    setPreview(null);
    setFilename(file.name);
    if (file.size > 2097152) {
      setError("Import files must be 2 MB or smaller.");
      return;
    }
    const f = file.name.toLowerCase().endsWith(".json")
      ? "json"
      : file.name.toLowerCase().endsWith(".csv")
        ? "csv"
        : null;
    if (!f) {
      setError("Choose a CSV or JSON file.");
      return;
    }
    try {
      const value = await file.text();
      setText(value);
      setFormat(f);
      setPreview(previewImport(value, f, options));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <div className="overlay">
      <div
        className="task-panel import-panel"
        role="dialog"
        aria-modal="true"
        aria-label={t("Bulk import")}
        ref={root}
        tabIndex={-1}
      >
        <div className="panel-title">
          <h2>{t("Bulk import")}</h2>
          <button
            disabled={busy}
            aria-label={t("Close import")}
            onClick={onClose}
          >
            <X />
          </button>
        </div>
        <p>
          {t(
            "Upload tasks, events, milestones, projects and campaigns. Preview and validate before saving.",
          )}
        </p>
        <p>
          {t(
            "CSV or JSON · up to 200 records · 2 MB maximum. Existing records are never overwritten.",
          )}
        </p>
        <button
          onClick={() => {
            const url = URL.createObjectURL(
              new Blob([CSV_TEMPLATE], { type: "text/csv" }),
            );
            const a = document.createElement("a");
            a.href = url;
            a.download = "scala-import-template.csv";
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          <Download size={16} />
          {t("Download CSV template")}
        </button>
        <label className="upload">
          <Upload size={20} />
          {t("Choose import file")}
          <input
            type="file"
            accept=".csv,.json,application/json,text/csv"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void load(file);
            }}
          />
        </label>
        <details>
          <summary>{t("File format help")}</summary>
          <p>
            {t(
              "Required activity fields: title, start and end (YYYY-MM-DD). Use kind: task, event or milestone. Use semicolons for dependency IDs and tags in CSV. Assignees must match registered names.",
            )}
          </p>
          <p>
            {t(
              "JSON accepts arrays named tasks, events, milestones, projects and campaigns. Projects use name, start and end. Campaigns also require project. Timed events may include startAt and endAt with a timezone offset.",
            )}
          </p>
          <p>
            {t(
              "Imports use the workspace status and category names in English, even when the interface is Spanish.",
            )}
          </p>
        </details>
        {filename && <h3>{filename}</h3>}
        {error && (
          <p role="alert" className="warning">
            {t(error)}
          </p>
        )}
        {preview && (
          <>
            <div role="status">
              <b>
                {preview.records.length} / {IMPORT_LIMIT} {t("records ready")}
              </b>
              {preview.errors.length > 0 && (
                <p className="warning">
                  {t(
                    "Fix the file and upload it again. Nothing has been saved.",
                  )}
                </p>
              )}
            </div>
            {preview.errors.length > 0 && (
              <ul role="alert" className="import-errors">
                {preview.errors.map((e, i) => (
                  <li key={i}>{t(e)}</li>
                ))}
              </ul>
            )}
            <div className="table-wrap import-preview">
              <table>
                <thead>
                  <tr>
                    <th>{t("Type")}</th>
                    <th>{t("Title")}</th>
                    <th>{t("Assignee")}</th>
                    <th>{t("Start date")}</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.records.map((r) => (
                    <tr key={r.data.id}>
                      <td>
                        {t(
                          "kind" in r.data
                            ? r.data.kind || "task"
                            : r.collection,
                        )}
                      </td>
                      <td>{"title" in r.data ? r.data.title : r.data.name}</td>
                      <td>
                        {"assignee" in r.data
                          ? r.data.assignee || t("Unassigned")
                          : "—"}
                      </td>
                      <td>{r.data.start}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        <div className="panel-actions">
          <button disabled={busy} onClick={onClose}>
            {t("Cancel")}
          </button>
          <button
            className="primary"
            disabled={
              busy ||
              !preview ||
              preview.errors.length > 0 ||
              !preview.records.length
            }
            onClick={async () => {
              try {
                setBusy(true);
                setError("");
                const validated = previewImport(text, format, options);
                if (validated.errors.length) {
                  setPreview(validated);
                  return;
                }
                await onCommit(validated.records);
                onClose();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {t(busy ? "Importing…" : "Confirm import")}
          </button>
        </div>
      </div>
    </div>
  );
}
