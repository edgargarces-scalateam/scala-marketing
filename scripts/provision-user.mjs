// Trusted terminal only. Admin credentials use ADC outside this repository.
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { operatorFirestore } from "./operator-firestore.mjs";
import { getFirestore } from "firebase-admin/firestore";
import { parseArgs } from "node:util";
import { statuses, priorities, channels, types } from "../src/domain.ts";
import { normalizeUsername, usernameEmail } from "../src/identity.ts";
import { operatorCredential } from "./operator-credential.mjs";
import { readPassword } from "./password-prompt.mjs";
const { values } = parseArgs({
  options: {
    project: { type: "string" },
    username: { type: "string" },
    email: { type: "string" },
    name: { type: "string" },
    role: { type: "string" },
    bootstrap: { type: "boolean", default: false },
    "set-password": { type: "boolean", default: false },
    "firebase-cli": { type: "boolean", default: false },
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
  !values.username ||
  !values.name ||
  !roles.includes(values.role)
)
  throw Error(
    "Required: --project ID --username USERNAME --name NAME --role ROLE [--email CONTACT_EMAIL] [--bootstrap] [--set-password]",
  );
const username = normalizeUsername(values.username),
  loginEmail = usernameEmail(username);
if (values.project.startsWith("demo-"))
  throw Error("Use npm run seed for local development.");
if (values.bootstrap && values.role !== "Administrator")
  throw Error("Bootstrap requires Administrator role.");
initializeApp({
  credential: await operatorCredential(values["firebase-cli"]),
  projectId: values.project,
});
const db = values["firebase-cli"]
    ? await operatorFirestore(values.project)
    : getFirestore(),
  auth = getAuth();
if (
  values.bootstrap &&
  !(
    await db
      .collection("users")
      .where("role", "==", "Administrator")
      .limit(1)
      .get()
  ).empty
)
  throw Error("An administrator already exists. Bootstrap refused.");
let user;
try {
  user = await auth.getUserByEmail(loginEmail);
} catch (e) {
  if (e.code !== "auth/user-not-found") throw e;
}
// Optional migration of a previously provisioned email/password identity, preserving its UID.
if (!user && values.email) {
  try {
    user = await auth.getUserByEmail(values.email);
  } catch (e) {
    if (e.code !== "auth/user-not-found") throw e;
  }
}
const names = await db
  .collection("users")
  .where("name", "==", values.name)
  .get();
if (names.docs.some((d) => d.id !== user?.uid))
  throw Error(
    "Display names must be unique for assignment permissions. Choose a distinct name.",
  );
let password;
if (!user || values["set-password"]) {
  password = await readPassword();
  if (password.length < 8)
    throw Error("Use a password of at least 8 characters.");
  if (password !== (await readPassword("Confirm password: ")))
    throw Error("Passwords do not match.");
}
if (user) {
  user = await auth.updateUser(user.uid, {
    email: loginEmail,
    displayName: values.name,
    ...(password ? { password } : {}),
  });
} else
  user = await auth.createUser({
    email: loginEmail,
    password,
    displayName: values.name,
    emailVerified: false,
  });
const settings = db.collection("settings").doc("workspace");
if (!(await settings.get()).exists)
  await settings.set({ statuses, priorities, channels, types, capacity: 40 });
await db
  .collection("users")
  .doc(user.uid)
  .set(
    {
      username,
      name: values.name,
      contactEmail: values.email || "",
      role: values.role,
      timezone: "America/Guayaquil",
    },
    { merge: true },
  );
await db.collection("activityHistory").add({
  actor: "trusted-operator",
  text: `Provisioned username ${username} as ${values.role}`,
  at: new Date().toISOString(),
  targetUid: user.uid,
});
console.log(
  `Profile ready. Username: ${username}. Passwords are stored only in Firebase Authentication. Distribute credentials privately.`,
);
