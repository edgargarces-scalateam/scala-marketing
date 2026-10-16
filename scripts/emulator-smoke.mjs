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
} from "firebase/firestore";
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
  "edgar@scala.local",
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
