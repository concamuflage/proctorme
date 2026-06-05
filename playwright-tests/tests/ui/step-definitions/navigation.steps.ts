import assert from "node:assert/strict";
import { Given, Then } from "@cucumber/cucumber";
import type { UiWorld } from "../support/world";

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
  await this.page.getByText(text, { exact: false }).first().waitFor();
});
