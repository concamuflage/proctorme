import assert from "node:assert/strict";
import { Given, Then, When } from "@cucumber/cucumber";
import type { APIResponse } from "@playwright/test";
import { generateGmailAlias } from "../../../support/emailTestData";
import { findAuthUserByEmail } from "../../../support/database/get/authUsers";
import { markUserEmailVerified } from "../../../support/database/update/authUsers";
import type { ApiWorld } from "../support/world";

const password = "TestPassword123!";

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

  const response = await world.signupApi.signup(world.signUpUser);
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

When<ApiWorld>("I submit the NextAuth credentials sign-in request", async function () {
  assert.ok(this.signUpUser, "Login user was not prepared.");
  this.loginResponse = await this.authApi.signInWithCredentials({
    email: this.signUpUser.email,
    password: this.signUpUser.password,
  });
});

When<ApiWorld>(
  "I submit the NextAuth credentials sign-in request with an incorrect password",
  async function () {
    assert.ok(this.signUpUser, "Login user was not prepared.");
    this.loginResponse = await this.authApi.signInWithCredentials({
      email: this.signUpUser.email,
      password: "WrongPassword123!",
    });
  },
);

Then<ApiWorld>(
  "the NextAuth session contains the signed-in account",
  async function () {
    assert.ok(this.signUpUser, "Login user was not prepared.");
    assert.ok(this.loginResponse, "Login response was not captured.");
    assert.equal(this.loginResponse.status(), 200);

    const loginPayload = await json(this.loginResponse);
    assert.equal(typeof loginPayload.url, "string");
    const redirectUrl = new URL(loginPayload.url as string, this.baseURL);
    assert.equal(redirectUrl.pathname, "/");

    const sessionResponse = await this.authApi.session();
    assert.equal(sessionResponse.status(), 200);

    const payload = await json(sessionResponse);
    const user = payload.user as Record<string, unknown> | undefined;
    assert.ok(user, "Session user was not returned.");

    // Validate the public session against the database row created for this scenario.
    const storedUser = await findAuthUserByEmail(this.signUpUser.email);
    assert.ok(storedUser, "Signed-in user was not found in the database.");
    assert.equal(storedUser.email_verified, true);
    assert.equal(user.email, this.signUpUser.email.toLowerCase());
    assert.equal(user.name, `${this.signUpUser.firstName} ${this.signUpUser.lastName}`);
    assert.equal(user.id, String(storedUser.id));

    // The session response is client-visible, so it should not leak internal auth fields.
    assert.equal(user.password_hash, undefined);
    assert.equal(user.emailVerified, undefined);
    assert.equal(user.verifiedEmail, undefined);

    const expires = payload.expires;
    assert.equal(typeof expires, "string");
    const expiresAt = new Date(expires as string);
    assert.ok(!Number.isNaN(expiresAt.getTime()), "Session expiry was not a valid date.");
    assert.ok(expiresAt.getTime() > Date.now(), "Session expiry should be in the future.");
  },
);

Then<ApiWorld>("the NextAuth credentials sign-in requires email verification", async function () {
  assert.ok(this.loginResponse, "Login response was not captured.");
  assert.equal(this.loginResponse.status(), 401);

  const payload = await json(this.loginResponse);
  const error = new URL(String(payload.url)).searchParams.get("error") || "";
  assert.match(error, /verify your email/i);
});

Then<ApiWorld>("the NextAuth credentials sign-in rejects the credentials", async function () {
  assert.ok(this.loginResponse, "Login response was not captured.");
  assert.equal(this.loginResponse.status(), 401);

  const payload = await json(this.loginResponse);
  const error = new URL(String(payload.url)).searchParams.get("error");
  assert.equal(error, "Invalid credentials");
});
