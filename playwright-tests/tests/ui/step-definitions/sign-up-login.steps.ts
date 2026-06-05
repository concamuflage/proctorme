import assert from "node:assert/strict";
import { Given, Then, When } from "@cucumber/cucumber";
import type { Page } from "@playwright/test";
import { expectedResendFromEmail, generateGmailAlias } from "../support/testEnv";
import { findLatestVerificationEmail } from "../support/gmailVerificationClient";
import type { UiWorld } from "../support/world";

const SIGNUP_SUCCESS_MESSAGE = "Check your email to verify your account before signing in.";
const PASSWORD_REQUIREMENTS_MESSAGE = "Password must be at least 12 characters and include uppercase, lowercase, a number, and no spaces.";

async function signUpWithEmail(page: Page, email: string, password: string) {
  await page.locator("#signup-first-name").fill("Playwright");
  await page.locator("#signup-last-name").fill("User");
  await page.locator("#signup-email").fill(email);
  await page.locator("#signup-password").fill(password);
  await page.locator("#signup-confirm-password").fill(password);
  await page.locator("#signup-submit").click();
}

async function loginWithEmail(page: Page, email: string, password: string) {
  await page.locator("#login-email").fill(email);
  await page.locator("#login-password").fill(password);
  await page.locator("#login-submit").click();
}

Given<UiWorld>("I open the signup page", async function () {
  assert.ok(this.page, "Page was not created.");
  await this.page.goto("/signup");
});

Given<UiWorld>("I open the login page", async function () {
  assert.ok(this.page, "Page was not created.");
  await this.page.goto("/login");
});

Then<UiWorld>("I should be on the signup page", async function () {
  assert.ok(this.page, "Page was not created.");
  await this.page.getByRole("heading", { name: "Create your account" }).waitFor();
});

Then<UiWorld>("I should be on the login page", async function () {
  assert.ok(this.page, "Page was not created.");
  await this.page.getByRole("heading", { name: "Welcome back" }).waitFor();
});

When<UiWorld>("I sign up with a plus email based on {string} and password {string}", async function (baseEmail: string, password: string) {
  assert.ok(this.page, "Page was not created.");
  this.generatedEmail = generateGmailAlias(baseEmail);
  await signUpWithEmail(this.page, this.generatedEmail, password);
});

When<UiWorld>("I sign up with the same generated plus email and password {string}", async function (password: string) {
  assert.ok(this.page, "Page was not created.");
  assert.ok(this.generatedEmail, "No generated email exists for this scenario.");
  await signUpWithEmail(this.page, this.generatedEmail, password);
});

When<UiWorld>("I sign up with a generated account using password {string}", async function (password: string) {
  assert.ok(this.page, "Page was not created.");
  this.generatedEmail = generateGmailAlias("concamuflage@gmail.com");
  await signUpWithEmail(this.page, this.generatedEmail, password);
});

Then<UiWorld>("the signup should be successful and ask the user to verify their email address", async function () {
  assert.ok(this.page, "Page was not created.");
  await this.page.locator("#signup-success").waitFor();
  assert.match(await this.page.locator("#signup-success").innerText(), new RegExp(SIGNUP_SUCCESS_MESSAGE));
});

Then<UiWorld>("the signup page should show a validation error", async function () {
  assert.ok(this.page, "Page was not created.");
  await this.page.locator("#signup-error").waitFor();
  const text = await this.page.locator("#signup-error").innerText();
  assert.match(text, /already exists/i);
});

Then<UiWorld>("the signup page should show the password requirements error", async function () {
  assert.ok(this.page, "Page was not created.");
  await this.page.locator("#signup-error").waitFor();
  assert.match(await this.page.locator("#signup-error").innerText(), new RegExp(PASSWORD_REQUIREMENTS_MESSAGE));
});

When<UiWorld>("I request a new verification email", async function () {
  assert.ok(this.page, "Page was not created.");
  await this.page.getByRole("button", { name: /Resend verification email/i }).click();
});

When<UiWorld>("I login in with the generated plus email and password {string}", async function (password: string) {
  assert.ok(this.page, "Page was not created.");
  assert.ok(this.generatedEmail, "No generated email exists for this scenario.");
  await loginWithEmail(this.page, this.generatedEmail, password);
});

Then<UiWorld>("the login should fail with an error message about email verification", async function () {
  assert.ok(this.page, "Page was not created.");
  await this.page.locator("#login-error").waitFor();
  assert.match(await this.page.locator("#login-error").innerText(), /verify your email/i);
});

Then<UiWorld>("the login should fail with an error message about incorrect password", async function () {
  assert.ok(this.page, "Page was not created.");
  await this.page.locator("#login-error").waitFor();
  assert.match(await this.page.locator("#login-error").innerText(), /invalid credentials|invalid email or password/i);
});

Then<UiWorld>("Wait 10 Seconds before login and look for verification email", async function () {
  assert.ok(this.page, "Page was not created.");
  await this.page.waitForTimeout(10_000);
});

Then<UiWorld>("I log into its email account through the API and find the verification email", async function () {
  assert.ok(this.generatedEmail, "No generated email exists for this scenario.");
  this.verificationEmail = await findLatestVerificationEmail(this.generatedEmail);
});

Then<UiWorld>("the verification email sender should be correct", function () {
  assert.ok(this.verificationEmail?.from, "No verification email sender was captured.");
  assert.ok(
    this.verificationEmail.from.includes(expectedResendFromEmail()),
    `Expected sender to include ${expectedResendFromEmail()}, received ${this.verificationEmail.from}`
  );
});

Then<UiWorld>("I click the link in the verification email", async function () {
  assert.ok(this.page, "Page was not created.");
  assert.ok(this.verificationEmail?.verificationLink, "No verification link was found.");
  await this.page.goto(this.verificationEmail.verificationLink);
});

Then<UiWorld>("the email verification should be successful", async function () {
  assert.ok(this.page, "Page was not created.");
  await this.page.getByRole("heading", { name: "Email verified" }).waitFor();
  await this.page.getByText("Email verified successfully", { exact: false }).waitFor();
});

Then<UiWorld>("the login should be successful and land on the role choice page", async function () {
  assert.ok(this.page, "Page was not created.");
  await this.page.waitForURL(/\/account\/role-choice/, { timeout: 15_000 });
  await this.page.getByRole("heading", { name: "What do you want to do?" }).waitFor();
});
