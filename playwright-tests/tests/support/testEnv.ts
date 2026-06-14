import "../../../lib/server/config/env.js";

/**
 * Reads a required environment variable for test setup.
 *
 * @param name - Environment variable name that must be configured.
 *
 * @returns The configured environment variable value.
 */
export function requiredTestEnv(name: string) {
  const value = process.env[name];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

/**
 * Reads an optional environment variable for test setup.
 *
 * @param name - Environment variable name that may be configured.
 *
 * @returns The configured value, or undefined when it is not set.
 */
export function optionalTestEnv(name: string) {
  const value = process.env[name];
  return typeof value === "string" && value.trim().length > 0
    ? value
    : undefined;
}

/**
 * Reads an optional boolean environment flag.
 *
 * @param name - Environment variable name that may be configured.
 * @param defaultValue - Value to use when the variable is not configured.
 *
 * @returns False only when the variable is explicitly set to "false"; otherwise the configured default.
 */
export function optionalBooleanTestEnv(name: string, defaultValue: boolean) {
  const value = optionalTestEnv(name);
  if (value === undefined) return defaultValue;
  return value !== "false";
}

// Base Gmail account used for plus-addressed generated test users.
export const testGmailBaseEmail = requiredTestEnv("TEST_GMAIL_BASE_EMAIL");

// Password assigned to generated signup/login test users.
export const generatedUserPassword = requiredTestEnv("TEST_GENERATED_USER_PASSWORD");

// Base URL used by API and UI tests when opening the app.
export const playwrightBaseUrl = requiredTestEnv("PLAYWRIGHT_BASE_URL");

// Browser device descriptor name used by UI tests when configured.
export const playwrightDevice = optionalTestEnv("PLAYWRIGHT_DEVICE");

// Viewport string used by UI tests when configured, for example 1280x720.
export const playwrightViewport = optionalTestEnv("PLAYWRIGHT_VIEWPORT");

// Optional Playwright storage state path for pre-authenticated UI tests.
export const playwrightStorageState = optionalTestEnv("PLAYWRIGHT_STORAGE_STATE");

// Enables video recording for UI test browser contexts.
export const playwrightVideoEnabled = optionalBooleanTestEnv("PLAYWRIGHT_VIDEO", false);

// Controls whether UI tests launch Chromium headless.
export const playwrightHeadless = optionalBooleanTestEnv("PLAYWRIGHT_HEADLESS", true);

// Enables Playwright trace collection for UI test scenarios.
export const playwrightTraceEnabled = optionalBooleanTestEnv("PLAYWRIGHT_TRACE", true);

// Captures a screenshot when a UI scenario fails.
export const playwrightScreenshotOnFailure = optionalBooleanTestEnv(
  "PLAYWRIGHT_SCREENSHOT_ON_FAILURE",
  true,
);
