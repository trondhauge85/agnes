import { test, expect, type Page } from "@playwright/test";

const mockCalendar = (page: Page) =>
  page.route("**/calendar/events**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        calendarId: "demo",
        provider: "google",
        filters: {},
        events: [],
      }),
    });
  });

const mockFamilyTodos = (page: Page) =>
  page.route("**/families/*/todos", async (route) => {
    const url = new URL(route.request().url());
    const familyId = url.pathname.split("/")[2] ?? "demo-family";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        familyId,
        todos: [
          {
            id: "todo-1",
            familyId,
            title: "Order groceries",
            status: "open",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      }),
    });
  });

const mockFamilyMeals = (page: Page) =>
  page.route("**/families/*/meals", async (route) => {
    const url = new URL(route.request().url());
    const familyId = url.pathname.split("/")[2] ?? "demo-family";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        familyId,
        meals: [
          {
            id: "meal-1",
            familyId,
            title: "Pasta night",
            status: "planned",
            mealType: "dinner",
            scheduledFor: new Date().toISOString(),
            servings: 4,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      }),
    });
  });

const mockCreateFamily = (page: Page) =>
  page.route("**/families", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "created",
        family: {
          id: "family-123",
          name: "The Test Crew",
          pictureUrl: "https://example.com/family.png",
        },
        message: "Family created.",
      }),
    });
  });

test("redirects unauthenticated users to login", async ({ page }) => {
  await page.goto("/app/home");

  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
});

test("routes authenticated users without a family to create family", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("agnes_auth_token", "playwright-token");
  });

  await page.goto("/app/home");

  await expect(page).toHaveURL(/\/app\/create-family/);
  await expect(page.getByRole("heading", { name: "Start a shared home base in under a minute." })).toBeVisible();
});

test("creates a family and lands on add member", async ({ page }) => {
  await mockCreateFamily(page);
  await page.goto("/login");

  await page.getByLabel("Email").fill("owner@example.com");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/app\/create-family/);

  await page.getByLabel("Family name").fill("The Test Crew");
  await page.getByLabel("Your name").fill("Taylor");
  await page.getByRole("button", { name: "Create family" }).click();

  await expect(page).toHaveURL(/\/app\/family\/add/);
  await expect(page.getByRole("heading", { name: "Add a family member" })).toBeVisible();
});

test("renders home when a token session exists and family is selected", async ({ page }) => {
  await mockCalendar(page);
  await mockFamilyTodos(page);
  await mockFamilyMeals(page);
  await page.addInitScript(() => {
    window.localStorage.setItem("agnes_auth_token", "playwright-token");
    window.localStorage.setItem(
      "agnes_families",
      JSON.stringify([{ id: "family-123", name: "The Test Crew", pictureUrl: "https://example.com/family.png" }])
    );
    window.localStorage.setItem("agnes_selected_family", "family-123");
  });

  await page.goto("/app/home");

  await expect(page.getByRole("heading", { name: "Agnes Home" })).toBeVisible();
  await expect(page.getByText("Snapshot of everything coming up.")).toBeVisible();
  await expect(page.getByText("Order groceries")).toBeVisible();
  await expect(page.getByText("Pasta night")).toBeVisible();
});
