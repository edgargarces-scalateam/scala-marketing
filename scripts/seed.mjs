// Emulator-only seed. Deliberately refuses production project IDs/hosts.
import {
  seedTasks,
  statuses,
  priorities,
  channels,
  types,
} from "../src/domain.ts";
const host = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
if (!/^(127\.0\.0\.1|localhost):\d+$/.test(host))
  throw Error("Seed only permits loopback emulators.");
const project = "demo-scala";
const email = "edgar@scala.local";
const password = "ScalaDemo2026!";
const auth = await fetch(
  "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  },
);
let user = await auth.json();
if (user.error?.message === "EMAIL_EXISTS") {
  const r = await fetch(
    "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  user = await r.json();
}
if (!user.localId)
  throw Error("Start the Auth emulator first. " + JSON.stringify(user.error));
const encode = (v) =>
  v === null
    ? { nullValue: null }
    : typeof v === "boolean"
      ? { booleanValue: v }
      : typeof v === "number"
        ? { doubleValue: v }
        : typeof v === "string"
          ? { stringValue: v }
          : Array.isArray(v)
            ? { arrayValue: { values: v.map(encode) } }
            : {
                mapValue: {
                  fields: Object.fromEntries(
                    Object.entries(v).map(([k, x]) => [k, encode(x)]),
                  ),
                },
              };
async function put(path, data) {
  const r = await fetch(
    `http://${host}/v1/projects/${project}/databases/(default)/documents/${path}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer owner",
      },
      body: JSON.stringify(encode(data).mapValue),
    },
  );
  if (!r.ok) throw Error(await r.text());
}
await put(`users/${user.localId}`, {
  name: "Edgar Garcés",
  email,
  role: "Administrator",
  timezone: "America/Guayaquil",
});
await put("settings/workspace", {
  statuses,
  priorities,
  channels,
  types,
  capacity: 40,
});
await put("projects/webinar", {
  name: "Automation Webinar",
  description: "What Should Your Business Automate First? — Webinar Campaign",
  archived: false,
  start: "2026-10-05",
  end: "2026-10-30",
  createdBy: user.localId,
});
await put("campaigns/october", {
  name: "October webinar launch",
  projectId: "webinar",
  description: "Webinar registration and follow-up",
  start: "2026-10-05",
  end: "2026-10-30",
  archived: false,
});
await put("milestones/live-webinar", {
  name: "Live Webinar",
  projectId: "webinar",
  at: "2026-10-24T18:00:00Z",
  timezone: "America/Los_Angeles",
});
for (const task of seedTasks())
  await put(`tasks/${task.id}`, { ...task, createdBy: user.localId });
console.log(
  `Emulator seed ready. Login: ${email} / ${password}. These credentials work ONLY in the local emulator.`,
);
