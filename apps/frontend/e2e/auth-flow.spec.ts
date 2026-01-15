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

test("redirects unauthenticated users to login", async ({ page }) => {
  await page.goto("/app/home");

  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
});

test("renders home when a token session exists", async ({ page }) => {
  await mockCalendar(page);
  await page.addInitScript(() => {
    window.localStorage.setItem("agnes_auth_token", "playwright-token");
  });

  await page.goto("/app/home");

  await expect(page.getByRole("heading", { name: "Agnes Home" })).toBeVisible();
  await expect(page.getByText("Snapshot of everything coming up.")).toBeVisible();
});
