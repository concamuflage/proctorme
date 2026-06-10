import assert from "node:assert/strict";
import { Given, Then, When } from "@cucumber/cucumber";
import type { APIResponse } from "@playwright/test";
import { LoginApi } from "../../apis/LoginApi";
import { SignupApi } from "../../apis/SignupApi";
import { generateGmailAlias } from "../../../support/emailTestData";
import { markUserEmailVerified } from "../support/authDb";
import type { ApiWorld } from "../support/world";

const password = "TestPassword123!";

/**
 * Runs the login api logic for this module.
 *
 * @param world - Input used by login api.
 *
 * @returns The result used by the surrounding flow.
 */
function loginApi(world: ApiWorld) {
  assert.ok(world.api, "API request context was not created.");
  return new LoginApi(world.api);
}

/**
 * Runs the signup api logic for this module.
 *
 * @param world - Input used by signup api.
 *
 * @returns The result used by the surrounding flow.
 */
function signupApi(world: ApiWorld) {
  assert.ok(world.api, "API request context was not created.");
  return new SignupApi(world.api);
}

/**
 * Runs the json logic for this module.
 *
 * @param response - Input used by json.
 *
 * @returns The result used by the surrounding flow.
 */
async function json(response: APIResponse) {
  return response.json() as Promise<Record<string, unknown>>;
}

/**
 * Creates api user for this flow.
 *
 * @param world - Input used by create api user.
 * @param verified - Input used by create api user.
 *
 * @returns The result used by the surrounding flow.
 */
async function createApiUser(world: ApiWorld, verified: boolean) {
  world.signUpUser = {
    firstName: "Api",
    lastName: "Login",
    email: generateGmailAlias(
      process.env.TEST_GMAIL_BASE_EMAIL || "concamuflage@gmail.com",
    ),
    password,
  };

  const response = await signupApi(world).signup(world.signUpUser);
  assert.equal(response.status(), 201);

  if (verified) {
    await markUserEmailVerified(world.signUpUser.email);
  }
}

Given<ApiWorld>("I have a verified API user", async function () {
  await createApiUser(this, true);
});

Given<ApiWorld>("I have an unverified API user", async function () {
  await createApiUser(this, false);
});

When<ApiWorld>("I submit the login API request", async function () {
  assert.ok(this.signUpUser, "Login user was not prepared.");
  this.signUpResponse = await loginApi(this).login({
    email: this.signUpUser.email,
    password: this.signUpUser.password,
  });
});

When<ApiWorld>(
  "I submit the login API request with an incorrect password",
  async function () {
    assert.ok(this.signUpUser, "Login user was not prepared.");
    this.signUpResponse = await loginApi(this).login({
      email: this.signUpUser.email,
      password: "WrongPassword123!",
    });
  },
);

Then<ApiWorld>(
  "the login API responds with the signed-in account",
  async function () {
    assert.ok(this.signUpUser, "Login user was not prepared.");
    assert.ok(this.signUpResponse, "Login response was not captured.");
    assert.equal(this.signUpResponse.status(), 200);

    const payload = await json(this.signUpResponse);
    assert.equal(payload.email, this.signUpUser.email.toLowerCase());
    assert.equal(payload.firstName, this.signUpUser.firstName);
    assert.equal(payload.lastName, this.signUpUser.lastName);
    assert.equal(payload.emailVerified, true);
  },
);

Then<ApiWorld>("the login API requires email verification", async function () {
  assert.ok(this.signUpResponse, "Login response was not captured.");
  assert.equal(this.signUpResponse.status(), 403);

  const payload = await json(this.signUpResponse);
  assert.equal(payload.code, "EMAIL_NOT_VERIFIED");
  assert.match(String(payload.error || ""), /verify your email/i);
});

Then<ApiWorld>("the login API rejects the credentials", async function () {
  assert.ok(this.signUpResponse, "Login response was not captured.");
  assert.equal(this.signUpResponse.status(), 401);

  const payload = await json(this.signUpResponse);
  assert.equal(payload.error, "Invalid credentials");
});
