import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium, devices, type Browser, type BrowserContext, type BrowserContextOptions, type Page } from "@playwright/test";
import type { ITestCaseHookParameter } from "@cucumber/cucumber";

import {
  playwrightDevice,
  playwrightHeadless,
  playwrightScreenshotOnFailure,
  playwrightStorageState,
  playwrightTraceEnabled,
  playwrightVideoEnabled,
  playwrightViewport,
} from "../../support/testEnv";

// UiDriver is the browser/session/tab bundle used by one Cucumber UI scenario.
// Keeping these together makes the World hook responsible for lifecycle, while
// test steps and Page Objects still work mostly with `page`.

export type UiDriver = {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  artifactsDir: string;
  traceActive: boolean;
};

type CreateUiDriverOptions = {
  baseURL: string;
  scenarioName: string;
};

// Scenario names can contain spaces and punctuation. Convert them into stable
// folder names for screenshots, traces, and videos.
/**
 * Runs the scenario slug logic for this module.
 *
 * @param name - Input used by scenario slug.
 *
 * @returns The result used by the surrounding flow.
 */
function scenarioSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "scenario";
}

// Optional viewport override for responsive checks, for example:
// PLAYWRIGHT_VIEWPORT=390x844 npm run test:ui
/**
 * Parses viewport from an external value.
 *
 * @param value - Input used by parse viewport.
 *
 * @returns The parsed value, or null when parsing fails.
 */
function parseViewport(value: string | undefined) {
  if (!value) return undefined;
  const match = value.match(/^(\d+)x(\d+)$/);
  if (!match) {
    throw new Error("PLAYWRIGHT_VIEWPORT must use WIDTHxHEIGHT format, for example 1280x720.");
  }
  return {
    width: Number(match[1]),
    height: Number(match[2]),
  };
}

// Build all BrowserContext options in one place. A context is the isolated
// browser session for a scenario: cookies, localStorage, viewport, device, video,
// and optional pre-authenticated storage state all belong here.
/**
 * Runs the context options logic for this module.
 *
 * @param baseURL - Input used by context options.
 * @param artifactsDir - Input used by context options.
 *
 * @returns The result used by the surrounding flow.
 */
function contextOptions(baseURL: string, artifactsDir: string): BrowserContextOptions {
  const viewport = parseViewport(playwrightViewport);

  return {
    ...(playwrightDevice ? devices[playwrightDevice] : {}),
    baseURL,
    ...(viewport ? { viewport } : {}),
    ...(playwrightStorageState ? { storageState: playwrightStorageState } : {}),
    ...(playwrightVideoEnabled ? { recordVideo: { dir: path.join(artifactsDir, "videos") } } : {}),
  };
}

// Create a fresh browser, isolated context, and page for one UI scenario.
// Tracing starts immediately so a failed scenario has a full timeline from the
// first navigation through the failure.
/**
 * Creates ui driver for this flow.
 *
 * @param options - Input used by create ui driver.
 *
 * @returns The result used by the surrounding flow.
 */
export async function createUiDriver(options: CreateUiDriverOptions): Promise<UiDriver> {
  const artifactsDir = path.join("test-results", "ui", scenarioSlug(options.scenarioName));

  await mkdir(artifactsDir, { recursive: true });

  const browser = await chromium.launch({ headless: playwrightHeadless });
  const context = await browser.newContext(contextOptions(options.baseURL, artifactsDir));

  if (playwrightTraceEnabled) {
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  }

  const page = await context.newPage();
  return { browser, context, page, artifactsDir, traceActive: playwrightTraceEnabled };
}

// Save visual debugging artifacts only when the scenario fails. Screenshots give
// a quick view of the final state; traces are better for root cause because they
// include actions, DOM snapshots, network activity, and console output.
/**
 * Runs the save ui failure artifacts logic for this module.
 *
 * @param driver - Input used by save ui failure artifacts.
 * @param scenario - Input used by save ui failure artifacts.
 *
 * @returns The result used by the surrounding flow.
 */
export async function saveUiFailureArtifacts(driver: UiDriver, scenario: ITestCaseHookParameter) {
  if (playwrightScreenshotOnFailure) {
    await driver.page.screenshot({
      fullPage: true,
      path: path.join(driver.artifactsDir, "failure.png"),
    });
  }

  if (driver.traceActive) {
    await driver.context.tracing.stop({
      path: path.join(driver.artifactsDir, "trace.zip"),
    });
    driver.traceActive = false;
    return;
  }

  // Keep the parameter used so future artifact naming can include scenario metadata.
  void scenario;
}

// Close the Playwright resources created for a scenario. If the scenario passed,
// stop tracing without saving a trace file so normal runs stay lightweight.
/**
 * Runs the close ui driver logic for this module.
 *
 * @param driver - Input used by close ui driver.
 *
 * @returns The result used by the surrounding flow.
 */
export async function closeUiDriver(driver: UiDriver) {
  if (driver.traceActive) {
    await driver.context.tracing.stop();
    driver.traceActive = false;
  }
  await driver.context.close();
  await driver.browser.close();
}
