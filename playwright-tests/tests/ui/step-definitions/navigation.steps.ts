import assert from "node:assert/strict";
import { Given, Then } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import type { UiWorld } from "../support/world";

/**
 * Runs the escaped reg exp logic for this module.
 *
 * @param value - Input used by escaped reg exp.
 *
 * @returns The result used by the surrounding flow.
 */
function escapedRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

Given<UiWorld>("I open the {string} page", async function (path: string) {
  assert.ok(this.page, "Page was not created.");
  await this.page.goto(path);
});

Then<UiWorld>("the page URL should contain {string}", async function (expectedPath: string) {
  assert.ok(this.page, "Page was not created.");
  assert.match(this.page.url(), new RegExp(escapedRegExp(expectedPath)));
});

Then<UiWorld>("the page should show {string}", async function (text: string) {
  assert.ok(this.page, "Page was not created.");
  await expect(this.page.getByText(text, { exact: false }).first()).toBeVisible();
});
