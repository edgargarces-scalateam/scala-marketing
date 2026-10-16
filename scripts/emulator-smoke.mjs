import { initializeApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { usernameEmail } from "../src/identity.ts";
import { seedTasks } from "../src/domain.ts";
if (
  process.env.GCLOUD_PROJECT !== "demo-scala" ||
  !process.env.FIRESTORE_EMULATOR_HOST
)
  throw Error("Run only through the demo-scala emulator suite.");
const app = initializeApp({ projectId: "demo-scala", apiKey: "demo-key" });
const auth = getAuth(app);
connectAuthEmulator(auth, "http://127.0.0.1:9099");
const db = getFirestore(app);
connectFirestoreEmulator(db, "127.0.0.1", 8080);
const { user } = await signInWithEmailAndPassword(
  auth,
  usernameEmail("edgar"),
  "ScalaDemo2026!",
);
const profile = (await getDoc(doc(db, "users", user.uid))).data();
if (profile?.role !== "Administrator") throw Error("Missing seeded admin");
const task = {
  ...seedTasks()[0],
  id: "auth-smoke",
  title: "Authenticated integration test",
  status: "Planned",
  approval: "Not requested",
  createdBy: user.uid,
  updatedBy: user.uid,
  history: [],
};
await setDoc(doc(db, "tasks", task.id), task);
await updateDoc(doc(db, "tasks", task.id), {
  status: "Completed",
  progress: 100,
  completedAt: new Date().toISOString(),
  history: [
    {
      text: "Completed via authenticated integration test",
      author: profile.name,
      at: new Date().toISOString(),
    },
  ],
});
if ((await getDoc(doc(db, "tasks", task.id))).data()?.status !== "Completed")
  throw Error("Task completion failed");
const imported = [
  {
    ...task,
    id: "import-event-smoke",
    kind: "event",
    title: "Imported planning event",
    status: "Planned",
    history: [
      { text: "Imported activity", author: profile.name, at: task.updatedAt },
    ],
  },
  {
    ...task,
    id: "import-milestone-smoke",
    kind: "milestone",
    title: "Imported launch milestone",
    status: "Planned",
    dependencies: ["import-event-smoke"],
    history: [
      { text: "Imported activity", author: profile.name, at: task.updatedAt },
    ],
  },
];
const batch = writeBatch(db);
for (const record of imported) {
  batch.set(doc(db, "tasks", record.id), record);
  batch.set(doc(db, "activityHistory", record.id), {
    taskId: record.id,
    actor: user.uid,
    text: "Imported activity",
    at: record.updatedAt,
  });
}
await batch.commit();
if (!(await getDoc(doc(db, "tasks", "import-milestone-smoke"))).exists())
  throw Error("Atomic import failed.");
const invalid = writeBatch(db);
invalid.set(doc(db, "tasks", "must-not-save"), {
  ...task,
  id: "must-not-save",
});
invalid.set(doc(db, "tasks", "invalid-import"), { ...task, title: "" });
let rejected = false;
try {
  await invalid.commit();
} catch {
  rejected = true;
}
if (!rejected || (await getDoc(doc(db, "tasks", "must-not-save"))).exists())
  throw Error("Invalid import was not rejected atomically.");
console.log(
  "PASS: authenticated multi-record import and audit batch; invalid batch leaves no partial records.",
);
await signOut(auth);
let denied = false;
try {
  await getDoc(doc(db, "tasks", task.id));
} catch {
  denied = true;
}
if (!denied) throw Error("Anonymous read unexpectedly permitted");
console.log(
  "PASS: Firebase Auth login → protected profile → task creation → completion → logout access denied.",
);
process.exit(0);
