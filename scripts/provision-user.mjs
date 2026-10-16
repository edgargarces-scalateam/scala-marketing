// Trusted operator tool; credentials come from Application Default Credentials, never the browser.
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { parseArgs } from "node:util";
import { statuses, priorities, channels, types } from "../src/domain.ts";
const { values } = parseArgs({
  options: {
    project: { type: "string" },
    email: { type: "string" },
    name: { type: "string" },
    role: { type: "string" },
    bootstrap: { type: "boolean", default: false },
  },
});
const roles = [
  "Administrator",
  "Manager",
  "Agency Editor",
  "Contributor",
  "Viewer",
];
if (
  !values.project ||
  !values.email ||
  !values.name ||
  !roles.includes(values.role)
)
  throw Error(
    "Required: --project ID --email EMAIL --name NAME --role ROLE [--bootstrap]",
  );
if (values.project.startsWith("demo-"))
  throw Error("Use npm run seed for local development.");
if (values.bootstrap && values.role !== "Administrator")
  throw Error("Bootstrap requires Administrator role.");
initializeApp({ credential: applicationDefault(), projectId: values.project });
const db = getFirestore();
if (values.bootstrap) {
  const existing = await db
    .collection("users")
    .where("role", "==", "Administrator")
    .limit(1)
    .get();
  if (!existing.empty)
    throw Error("An administrator already exists. Bootstrap refused.");
}
let user;
try {
  user = await getAuth().getUserByEmail(values.email);
} catch (e) {
  if (e.code !== "auth/user-not-found") throw e;
  user = await getAuth().createUser({
    email: values.email,
    displayName: values.name,
    emailVerified: false,
  });
}
const settings = db.collection("settings").doc("workspace");
if (!(await settings.get()).exists)
  await settings.set({ statuses, priorities, channels, types, capacity: 40 });
const names = await db
  .collection("users")
  .where("name", "==", values.name)
  .get();
if (names.docs.some((d) => d.id !== user.uid))
  throw Error(
    "Display names must be unique for assignment permissions. Choose a distinct name.",
  );
await db
  .collection("users")
  .doc(user.uid)
  .set(
    {
      name: values.name,
      email: values.email,
      role: values.role,
      timezone: "America/Guayaquil",
    },
    { merge: true },
  );
await db
  .collection("activityHistory")
  .add({
    actor: "trusted-operator",
    text: `Provisioned ${values.email} as ${values.role}`,
    at: new Date().toISOString(),
    targetUid: user.uid,
  });
// Generate only. The operator distributes the link privately; this script sends no email.
const link = await getAuth().generatePasswordResetLink(values.email);
console.log(
  "Profile provisioned. Share this one-time password setup link privately with the intended user:",
);
console.log(link);
