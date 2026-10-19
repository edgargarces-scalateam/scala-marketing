import { test, expect } from "@playwright/test";
test("demo login, create activity and complete it", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore the local demo" }).click();
  await expect(
    page.getByRole("heading", { name: "Good morning, Edgar" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "New activity" }).click();
  await page
    .getByLabel("Title", { exact: true })
    .fill("Review webinar recording");
  await page.getByRole("button", { name: "Save activity" }).click();
  await page
    .getByRole("button", { name: "All activities", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Review webinar recording", exact: true })
    .click();
  await page.getByLabel("Status", { exact: true }).selectOption("Completed");
  await page.getByRole("button", { name: "Save activity" }).click();
  await page
    .getByRole("button", { name: "Review webinar recording", exact: true })
    .click();
  await expect(page.getByLabel("Status", { exact: true })).toHaveValue(
    "Completed",
  );
  await page.getByRole("button", { name: "Close details" }).click();
  await page.getByRole("button", { name: "Timeline", exact: true }).click();
  await expect(page.getByRole("region", { name: "Campaign timeline" })).toBeVisible();
  for (const scale of ["Day", "Month", "Quarter", "Week"]) {
    await page.getByLabel("Timeline scale", { exact: true }).selectOption(scale);
    await expect(page.getByLabel("Timeline scale", { exact: true })).toHaveValue(scale);
  }
  await page.getByRole("button", { name: /^Review webinar recording: / }).click();
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue("Review webinar recording");
  await page.getByRole("button", { name: "Close details" }).click();
  await page.getByRole("button", { name: "Calendar", exact: true }).click();
  await expect(page.locator(".calendar")).toBeVisible();
});
test("Spanish toggle translates navigation and preserves stored status values", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Switch to Spanish" }).click();
  await expect(
    page.getByRole("heading", { name: "Avancemos juntos." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Explorar la demo local" }).click();
  await expect(
    page.getByRole("heading", { name: "Hola, Edgar" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Nueva actividad" }).click();
  await page.getByLabel("Título", { exact: true }).fill("Prueba bilingüe");
  await page.getByLabel("Estado", { exact: true }).selectOption("Completed");
  await page.getByRole("button", { name: "Guardar actividad" }).click();
  await page
    .getByRole("button", { name: "Todas las actividades", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Prueba bilingüe", exact: true })
    .click();
  await expect(page.getByLabel("Estado", { exact: true })).toHaveValue(
    "Completed",
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Avancemos juntos." }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
});
test("creates a project for campaign planning", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore the local demo" }).click();
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page.getByRole("button", { name: "New project", exact: true }).click();
  await page
    .getByLabel("Name", { exact: true })
    .fill("Quarterly growth campaign");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Quarterly growth campaign" }),
  ).toBeVisible();
});
test("bulk import validates a file before saving tasks and events", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore the local demo" }).click();
  await page.getByRole("button", { name: "Bulk import", exact: true }).click();
  await page
    .getByLabel("Choose import file")
    .setInputFiles({
      name: "activities.json",
      mimeType: "application/json",
      buffer: Buffer.from(
        JSON.stringify({
          tasks: [
            {
              id: "bulk-test-task",
              title: "Imported launch checklist",
              start: "2026-10-20",
              end: "2026-10-21",
              assignee: "Edgar Garcés",
            },
          ],
          events: [
            {
              id: "bulk-test-event",
              title: "Imported team review",
              start: "2026-10-22",
              end: "2026-10-22",
              dependencies: ["bulk-test-task"],
            },
          ],
        }),
      ),
    });
  await expect(page.getByRole("status")).toContainText("2 / 200");
  await page
    .getByRole("button", { name: "Confirm import", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Bulk import" }),
  ).not.toBeVisible();
  await page
    .getByRole("button", { name: "All activities", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Imported launch checklist",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Imported team review", exact: true }),
  ).toBeVisible();
});
test("bulk import rejects unregistered assignees without enabling save", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore the local demo" }).click();
  await page.getByRole("button", { name: "Bulk import", exact: true }).click();
  await page
    .getByLabel("Choose import file")
    .setInputFiles({
      name: "invalid.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        "title,start,end,assignee\nBad import,2026-10-20,2026-10-21,Marketing Agency\n",
      ),
    });
  await expect(page.getByRole("alert")).toContainText(
    "not a registered member",
  );
  await expect(
    page.getByRole("button", { name: "Confirm import", exact: true }),
  ).toBeDisabled();
});
test("registered names populate filters and workload and login uses usernames", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByLabel("Username", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Email address", { exact: true })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Explore the local demo" }).click();
  await page
    .getByRole("button", { name: "All activities", exact: true })
    .click();
  await expect(page.getByLabel("Person filter")).toContainText("Edgar Garcés");
  await expect(page.getByLabel("Person filter")).not.toContainText(
    "Business associate",
  );
  await expect(page.getByLabel("Person filter")).not.toContainText(
    "Marketing agency",
  );
  await page.getByRole("button", { name: "Workload", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Edgar Garcés", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Marketing agency", exact: true }),
  ).toHaveCount(0);
});
test("sidebar project plus opens the actual creation form", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === "mobile",
    "Sidebar is replaced by navigation on phones.",
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Explore the local demo" }).click();
  await page.getByRole("button", { name: "Add project", exact: true }).click();
  await expect(page.getByLabel("Name", { exact: true })).toBeVisible();
});
