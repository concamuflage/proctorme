import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium, devices, type Browser, type BrowserContext, type BrowserContextOptions, type Page } from "@playwright/test";
import type { ITestCaseHookParameter } from "@cucumber/cucumber";

import "../../../../lib/server/config/env.js";

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
function scenarioSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "scenario";
}

// Optional viewport override for responsive checks, for example:
// PLAYWRIGHT_VIEWPORT=390x844 npm run test:ui
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
function contextOptions(baseURL: string, artifactsDir: string): BrowserContextOptions {
  const deviceName = process.env.PLAYWRIGHT_DEVICE;
  const viewport = parseViewport(process.env.PLAYWRIGHT_VIEWPORT);
  const storageState = process.env.PLAYWRIGHT_STORAGE_STATE;
  const videoEnabled = (process.env.PLAYWRIGHT_VIDEO || "false") !== "false";

  return {
    ...(deviceName ? devices[deviceName] : {}),
    baseURL,
    ...(viewport ? { viewport } : {}),
    ...(storageState ? { storageState } : {}),
    ...(videoEnabled ? { recordVideo: { dir: path.join(artifactsDir, "videos") } } : {}),
  };
}

// Create a fresh browser, isolated context, and page for one UI scenario.
// Tracing starts immediately so a failed scenario has a full timeline from the
// first navigation through the failure.
export async function createUiDriver(options: CreateUiDriverOptions): Promise<UiDriver> {
  const headless = (process.env.PLAYWRIGHT_HEADLESS || "true") !== "false";
  const tracingEnabled = (process.env.PLAYWRIGHT_TRACE || "true") !== "false";
  const artifactsDir = path.join("test-results", "ui", scenarioSlug(options.scenarioName));

  await mkdir(artifactsDir, { recursive: true });

  const browser = await chromium.launch({ headless });
  const context = await browser.newContext(contextOptions(options.baseURL, artifactsDir));

  if (tracingEnabled) {
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  }

  const page = await context.newPage();
  return { browser, context, page, artifactsDir, traceActive: tracingEnabled };
}

// Save visual debugging artifacts only when the scenario fails. Screenshots give
// a quick view of the final state; traces are better for root cause because they
// include actions, DOM snapshots, network activity, and console output.
export async function saveUiFailureArtifacts(driver: UiDriver, scenario: ITestCaseHookParameter) {
  if ((process.env.PLAYWRIGHT_SCREENSHOT_ON_FAILURE || "true") !== "false") {
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
export async function closeUiDriver(driver: UiDriver) {
  if (driver.traceActive) {
    await driver.context.tracing.stop();
    driver.traceActive = false;
  }
  await driver.context.close();
  await driver.browser.close();
}
