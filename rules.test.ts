import { readFileSync } from "node:fs";
import { beforeAll, afterAll, it } from "vitest";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, setDoc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";
import { seedTasks, statuses, priorities } from "./src/domain";
let env: RulesTestEnvironment;
beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-scala",
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
    storage: {
      rules: readFileSync("storage.rules", "utf8"),
      host: "127.0.0.1",
      port: 9199,
    },
  });
  await env.withSecurityRulesDisabled(async (c) => {
    const db = c.firestore();
    for (const role of [
      "Administrator",
      "Manager",
      "Agency Editor",
      "Contributor",
      "Viewer",
    ])
      await setDoc(doc(db, "users", role), { role, name: role });
    await setDoc(doc(db, "settings", "workspace"), { statuses, priorities });
    const t = {
      ...seedTasks()[0],
      assignee: "Contributor",
      status: "Planned",
      createdBy: "Administrator",
    };
    await setDoc(doc(db, "tasks", t.id), t);
  });
});
afterAll(async () => {
  await env?.cleanup();
});
it("denies anonymous and uninvited reads", async () => {
  await assertFails(
    getDoc(doc(env.unauthenticatedContext().firestore(), "tasks", "task-1")),
  );
  await assertFails(
    getDoc(
      doc(env.authenticatedContext("stranger").firestore(), "tasks", "task-1"),
    ),
  );
});
it("permits team reads but denies viewer changes", async () => {
  const db = env.authenticatedContext("Viewer").firestore();
  await assertSucceeds(getDoc(doc(db, "tasks", "task-1")));
  await assertFails(
    updateDoc(doc(db, "tasks", "task-1"), { status: "Completed" }),
  );
});
it("denies role escalation and self-provisioning", async () => {
  const db = env.authenticatedContext("Viewer").firestore();
  await assertFails(
    updateDoc(doc(db, "users", "Viewer"), { role: "Administrator" }),
  );
  await assertFails(
    setDoc(
      doc(
        env.authenticatedContext("stranger").firestore(),
        "users",
        "stranger",
      ),
      { role: "Administrator" },
    ),
  );
});
it("permits an audited manager update and denies agency approvals", async () => {
  const db = env.authenticatedContext("Manager").firestore();
  const t = (await getDoc(doc(db, "tasks", "task-1"))).data()!;
  await assertSucceeds(
    updateDoc(doc(db, "tasks", "task-1"), {
      status: "In progress",
      updatedBy: "Manager",
      history: [
        ...t.history,
        { text: "Started work", author: "Manager", at: "2026-10-16T12:00:00Z" },
      ],
    }),
  );
  const agency = env.authenticatedContext("Agency Editor").firestore();
  await assertFails(
    updateDoc(doc(agency, "tasks", "task-1"), {
      status: "Approved",
      approval: "Approved",
      updatedBy: "Agency Editor",
      history: [
        ...t.history,
        {
          text: "Approved",
          author: "Agency Editor",
          at: "2026-10-16T12:00:00Z",
        },
      ],
    }),
  );
});

it("scopes contributors to assigned execution fields", async () => {
  const db = env.authenticatedContext("Contributor").firestore();
  const t = (await getDoc(doc(db, "tasks", "task-1"))).data()!;
  const history = [
    ...t.history,
    {
      text: "Completed checklist",
      author: "Contributor",
      at: "2026-10-16T12:00:00Z",
    },
  ];
  await assertSucceeds(
    updateDoc(doc(db, "tasks", "task-1"), {
      progress: 75,
      updatedBy: "Contributor",
      history,
    }),
  );
  await assertFails(
    updateDoc(doc(db, "tasks", "task-1"), {
      assignee: "Manager",
      updatedBy: "Contributor",
      history: [
        ...history,
        {
          text: "Reassigned",
          author: "Contributor",
          at: "2026-10-16T12:00:00Z",
        },
      ],
    }),
  );
  await assertFails(
    updateDoc(doc(db, "tasks", "task-1"), {
      end: "2026-10-30",
      updatedBy: "Contributor",
      history: [
        ...history,
        {
          text: "Rescheduled",
          author: "Contributor",
          at: "2026-10-16T12:00:00Z",
        },
      ],
    }),
  );
});
it("requires valid fields for task creation", async () => {
  const db = env.authenticatedContext("Agency Editor").firestore();
  const t = {
    ...seedTasks()[1],
    createdBy: "Agency Editor",
    updatedBy: "Agency Editor",
    approval: "Not requested",
    status: "Planned",
  };
  await assertSucceeds(setDoc(doc(db, "tasks", "created"), t));
  await assertFails(setDoc(doc(db, "tasks", "invalid"), { ...t, title: "" }));
  await assertFails(
    setDoc(doc(db, "tasks", "forged-approval"), {
      ...t,
      approval: "Approved",
      status: "Approved",
    }),
  );
});
it("enforces attachment role, MIME type and existing task restrictions", async () => {
  const content = new Uint8Array([1, 2, 3]);
  await assertSucceeds(
    uploadBytes(
      ref(
        env.authenticatedContext("Contributor").storage(),
        "tasks/task-1/allowed.pdf",
      ),
      content,
      { contentType: "application/pdf" },
    ),
  );
  await assertFails(
    uploadBytes(
      ref(
        env.authenticatedContext("Viewer").storage(),
        "tasks/task-1/denied.pdf",
      ),
      content,
      { contentType: "application/pdf" },
    ),
  );
  await assertFails(
    uploadBytes(
      ref(
        env.authenticatedContext("Administrator").storage(),
        "tasks/task-1/script.svg",
      ),
      content,
      { contentType: "image/svg+xml" },
    ),
  );
  await assertFails(
    uploadBytes(
      ref(
        env.authenticatedContext("Administrator").storage(),
        "tasks/missing/task.pdf",
      ),
      content,
      { contentType: "application/pdf" },
    ),
  );
});
it("requires the trusted terminal for profile creation and role changes, even for administrators", async () => {
  const db = env.authenticatedContext("Administrator").firestore();
  await assertFails(
    setDoc(doc(db, "users", "web-created"), {
      name: "Web account",
      role: "Viewer",
    }),
  );
  await assertFails(updateDoc(doc(db, "users", "Viewer"), { role: "Manager" }));
});
