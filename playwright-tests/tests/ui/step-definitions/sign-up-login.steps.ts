import assert from "node:assert/strict";
import { Given, Then, When } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { generateGmailAlias } from "../../support/emailTestData";
import { expectedResendFromEmail, findLatestVerificationEmail } from "../../support/gmailVerificationClient";
import { LoginPage } from "../pages/LoginPage";
import { RoleChoicePage } from "../pages/RoleChoicePage";
import { SignupPage } from "../pages/SignupPage";
import { VerifyEmailPage } from "../pages/VerifyEmailPage";
import type { UiWorld } from "../support/world";

const SIGNUP_SUCCESS_MESSAGE = "Check your email to verify your account before signing in.";
const PASSWORD_REQUIREMENTS_MESSAGE = "Password must be at least 12 characters and include uppercase, lowercase, a number, and no spaces.";

const signupPages = new WeakMap<UiWorld, SignupPage>();
const loginPages = new WeakMap<UiWorld, LoginPage>();
const verifyEmailPages = new WeakMap<UiWorld, VerifyEmailPage>();
const roleChoicePages = new WeakMap<UiWorld, RoleChoicePage>();

function signupPage(world: UiWorld) {
  assert.ok(world.page, "Page was not created.");
  let page = signupPages.get(world);
  if (!page) {
    page = new SignupPage(world.page);
    signupPages.set(world, page);
  }
  return page;
}

function loginPage(world: UiWorld) {
  assert.ok(world.page, "Page was not created.");
  let page = loginPages.get(world);
  if (!page) {
    page = new LoginPage(world.page);
    loginPages.set(world, page);
  }
  return page;
}

function verifyEmailPage(world: UiWorld) {
  assert.ok(world.page, "Page was not created.");
  let page = verifyEmailPages.get(world);
  if (!page) {
    page = new VerifyEmailPage(world.page);
    verifyEmailPages.set(world, page);
  }
  return page;
}

function roleChoicePage(world: UiWorld) {
  assert.ok(world.page, "Page was not created.");
  let page = roleChoicePages.get(world);
  if (!page) {
    page = new RoleChoicePage(world.page);
    roleChoicePages.set(world, page);
  }
  return page;
}

Given<UiWorld>("I open the signup page", async function () {
  await signupPage(this).goto();
});

Given<UiWorld>("I open the login page", async function () {
  await loginPage(this).goto();
});

Then<UiWorld>("I should be on the signup page", async function () {
  await expect(signupPage(this).heading).toBeVisible();
});

Then<UiWorld>("I should be on the login page", async function () {
  await expect(loginPage(this).heading).toBeVisible();
});

When<UiWorld>("I sign up with a plus email based on {string} and password {string}", async function (baseEmail: string, password: string) {
  this.generatedEmail = generateGmailAlias(baseEmail);
  await signupPage(this).signup({
    firstName: "Playwright",
    lastName: "User",
    email: this.generatedEmail,
    password,
  });
});

When<UiWorld>("I sign up with the same generated plus email and password {string}", async function (password: string) {
  assert.ok(this.generatedEmail, "No generated email exists for this scenario.");
  await signupPage(this).signup({
    firstName: "Playwright",
    lastName: "User",
    email: this.generatedEmail,
    password,
  });
});

When<UiWorld>("I sign up with a generated account using password {string}", async function (password: string) {
  this.generatedEmail = generateGmailAlias("concamuflage@gmail.com");
  await signupPage(this).signup({
    firstName: "Playwright",
    lastName: "User",
    email: this.generatedEmail,
    password,
  });
});

Then<UiWorld>("the signup should be successful and ask the user to verify their email address", async function () {
  const page = signupPage(this);
  await expect(page.successMessage).toBeVisible();
  await expect(page.successMessage).toContainText(SIGNUP_SUCCESS_MESSAGE);
});

Then<UiWorld>("the signup page should show a validation error", async function () {
  const page = signupPage(this);
  await expect(page.errorMessage).toBeVisible();
  await expect(page.errorMessage).toContainText(/already exists/i);
});

Then<UiWorld>("the signup page should show the password requirements error", async function () {
  const page = signupPage(this);
  await expect(page.errorMessage).toBeVisible();
  await expect(page.errorMessage).toContainText(PASSWORD_REQUIREMENTS_MESSAGE);
});

When<UiWorld>("I request a new verification email", async function () {
  await signupPage(this).resendVerificationEmail();
});

When<UiWorld>("I login in with the generated plus email and password {string}", async function (password: string) {
  assert.ok(this.generatedEmail, "No generated email exists for this scenario.");
  await loginPage(this).login(this.generatedEmail, password);
});

Then<UiWorld>("the login should fail with an error message about email verification", async function () {
  const page = loginPage(this);
  await expect(page.errorMessage).toBeVisible();
  await expect(page.errorMessage).toContainText(/verify your email/i);
});

Then<UiWorld>("the login should fail with an error message about incorrect password", async function () {
  const page = loginPage(this);
  await expect(page.errorMessage).toBeVisible();
  await expect(page.errorMessage).toContainText(/invalid credentials|invalid email or password/i);
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
  await verifyEmailPage(this).waitForSuccessfulVerification();
});

Then<UiWorld>("the login should be successful and land on the role choice page", async function () {
  await roleChoicePage(this).waitForLoaded();
});
