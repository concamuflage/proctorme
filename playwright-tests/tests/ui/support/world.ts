import { After, Before, setDefaultTimeout, setWorldConstructor } from "@cucumber/cucumber";
import { chromium, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { deleteUserByEmail } from "./databaseCleanup";
import type { VerificationEmail } from "./gmailVerificationClient";

// Cucumber creates one World object per scenario.
// This class stores scenario-specific Playwright state and test data so steps
// can share them through `this`.
export class UiWorld {
  // Base URL for relative page.goto calls. Override with PLAYWRIGHT_BASE_URL
  // when running against staging or another local port.
  baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

  // Playwright browser process, isolated browser session, and active tab.
  browser: Browser | null = null;
  context: BrowserContext | null = null;
  page: Page | null = null;

  // Data created during signup/email-verification scenarios.
  generatedEmail: string | null = null;
  verificationEmail: VerificationEmail | null = null;
}

// Some UI steps wait for email delivery or navigation, so use a timeout longer
// than Cucumber's 5 second default.
setDefaultTimeout(30_000);

// Tell Cucumber to use UiWorld as the `this` object for UI steps.
setWorldConstructor(UiWorld);

// Runs before each scenario. It starts a clean browser context so each scenario
// gets an isolated session with no reused cookies or localStorage.
Before<UiWorld>(async function () {
  // Headless is the default for automated tests. Set PLAYWRIGHT_HEADLESS=false
  // when you want to watch the browser for debugging.
  const headless = process.env.PLAYWRIGHT_HEADLESS !== "false";
  this.browser = await chromium.launch({ headless });
  this.context = await this.browser.newContext({ baseURL: this.baseURL });
  this.page = await this.context.newPage();
});

// Runs after each scenario. It closes browser resources and deletes the user
// account created by the scenario, if one was generated.
After<UiWorld>(async function () {
  await this.page?.close();
  await this.context?.close();
  await this.browser?.close();
  await deleteUserByEmail(this.generatedEmail);
});
