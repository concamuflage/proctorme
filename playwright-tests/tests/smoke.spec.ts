import { expect, test } from "@playwright/test";

test("home page loads", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/$/);
});

test("signup page is reachable", async ({ page }) => {
  await page.goto("/signup");
  // Create your account
  await expect(page.getByRole("heading", { name: /sign up/i })).toBeVisible();
});

test("login page is reachable", async ({ page }) => {
  await page.goto("/login");

  await expect(page.locator("#login-email")).toBeVisible();
});
