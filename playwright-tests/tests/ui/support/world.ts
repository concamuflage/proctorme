import { After, AfterAll, Before, setDefaultTimeout, setWorldConstructor, Status } from "@cucumber/cucumber";
import { type Page } from "@playwright/test";
import { deleteUserByEmail } from "../../support/databaseCleanup";
import type { VerificationEmail } from "../../support/gmailVerificationClient";
import { endTestDbPool } from "../../support/databasePool";
import "../../../../lib/server/config/env.js";
import { closeUiDriver, createUiDriver, saveUiFailureArtifacts, type UiDriver } from "./uiDriverFactory";

// Cucumber creates one World object per scenario.
// This class stores scenario-specific Playwright state and test data so steps
// can share them through `this`.
/**
 * Represents the ui world abstraction used by this project.
 */
export class UiWorld {
  // Base URL for relative page.goto calls. Override with PLAYWRIGHT_BASE_URL
  // when running against staging or another local port.
  baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

  // Shared Playwright browser/session/tab bundle for the current scenario.
  uiDriver: UiDriver | null = null;

  // Active tab exposed directly because Page Objects and steps use it.
  page: Page | null = null;

  // Data created during signup/email-verification scenarios.
  generatedEmail: string | null = null;
  verificationEmail: VerificationEmail | null = null;
}

// Some UI steps wait for email delivery and Gmail API polling, so use a timeout
// longer than Cucumber's 5 second default.
setDefaultTimeout(75_000);

// Tell Cucumber to use UiWorld as the `this` object for UI steps.
setWorldConstructor(UiWorld);

// Runs before each scenario. It starts a clean browser context so each scenario
// gets an isolated session with no reused cookies or localStorage.
Before<UiWorld>(async function (scenario) {
  this.uiDriver = await createUiDriver({
    baseURL: this.baseURL,
    scenarioName: scenario.pickle.name,
  });
  this.page = this.uiDriver.page;
});

// Runs after each scenario. It closes browser resources and deletes the user
// account created by the scenario, if one was generated.
After<UiWorld>(async function (scenario) {
  if (scenario.result?.status === Status.FAILED && this.uiDriver) {
    await saveUiFailureArtifacts(this.uiDriver, scenario);
  }

  if (this.uiDriver) {
    await closeUiDriver(this.uiDriver);
  }

  this.page = null;
  this.uiDriver = null;
  await deleteUserByEmail(this.generatedEmail);
});

// Close the shared database pool once all UI scenarios have finished.
AfterAll(async function () {
  await endTestDbPool();
});
