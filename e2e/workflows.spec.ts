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
  await expect(page.locator(".gantt")).toBeVisible();
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
