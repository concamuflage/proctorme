import assert from "node:assert/strict";
import { Given, When } from "@cucumber/cucumber";
import { createVerifiedUserWithNoRoles } from "../../support/authSetup";
import { LoginPage } from "../pages/LoginPage";
import type { UiWorld } from "../support/world";

/**
 * Creates a login page object for choose-role steps.
 *
 * @param world - Current UI scenario world containing the active page.
 *
 * @returns Login page object for the active browser page.
 */
function loginPage(world: UiWorld) {
  assert.ok(world.page, "Page was not created.");
  return new LoginPage(world.page);
}

Given<UiWorld>(
  "I have a verified generated user with no roles",
  async function () {
    this.signUpUser = await createVerifiedUserWithNoRoles(this.baseURL);
    this.generatedEmail = this.signUpUser.email;
  },
);

Given<UiWorld>(
  "I have a verified generated user with base email {string}",
  async function (baseEmail: string) {
    this.signUpUser = await createVerifiedUserWithNoRoles(this.baseURL, baseEmail);
    this.generatedEmail = this.signUpUser.email;
  },
);

When<UiWorld>(
  "I log in with the generated user",
  async function () {
    assert.ok(this.signUpUser, "Generated user was not prepared.");
    await loginPage(this).login(this.signUpUser.email, this.signUpUser.password);
  },
);

When<UiWorld>(
  "I login in as the generated user",
  async function () {
    assert.ok(this.signUpUser, "Generated user was not prepared.");
    await loginPage(this).login(this.signUpUser.email, this.signUpUser.password);
  },
);
