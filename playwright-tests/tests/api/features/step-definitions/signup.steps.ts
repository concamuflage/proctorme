import assert from "node:assert/strict";
import { Given, Then, When } from "@cucumber/cucumber";
import type { APIResponse } from "@playwright/test";
import { newSignupUser } from "../../../support/signupTestData";
import {
  expectedResendFromEmail,
  findLatestVerificationEmail,
} from "../../../support/gmailVerificationClient";
import { findAuthUserByEmail } from "../../../support/database/get/authUsers";
import type { ApiWorld } from "../support/world";

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

Given<ApiWorld>("I have a new signup API user", async function () {
  this.signUpUser = newSignupUser();
});

Given<ApiWorld>(
  "I have already signed up through the signup API",
  async function () {
    this.signUpUser = newSignupUser();
    this.signUpResponse = await this.signupApi.signup(this.signUpUser);
    assert.equal(this.signUpResponse.status(), 201);
  },
);

When<ApiWorld>("I submit the signup API request", async function () {
  assert.ok(this.signUpUser, "Signup user was not prepared.");
  this.signUpResponse = await this.signupApi.signup(this.signUpUser);
});

When<ApiWorld>(
  "I submit the signup API request with a weak password",
  async function () {
    assert.ok(this.signUpUser, "Signup user was not prepared.");
    this.signUpResponse = await this.signupApi.signup({
      ...this.signUpUser,
      password: "weak",
    });
  },
);

When<ApiWorld>("I submit the signup API request again", async function () {
  assert.ok(this.signUpUser, "Signup user was not prepared.");
  this.signUpResponse = await this.signupApi.signup(this.signUpUser);
});

Then<ApiWorld>(
  "the signup API responds with a verification message",
  async function () {
    assert.ok(this.signUpResponse, "Signup response was not captured.");
    assert.equal(this.signUpResponse.status(), 201);

    const payload = await json(this.signUpResponse);
    assert.equal(
      payload.message,
      "Check your email to verify your account before signing in.",
    );
    assert.equal(payload.id, undefined);
    assert.equal(payload.email, undefined);
    assert.equal(payload.firstName, undefined);
    assert.equal(payload.lastName, undefined);
  },
);

Then<ApiWorld>(
  "the signup API user is stored in the database",
  async function () {
    assert.ok(this.signUpUser, "Signup user was not prepared.");
    const user = await findAuthUserByEmail(this.signUpUser.email);

    assert.ok(user, "Signup user was not stored.");
    assert.equal(user.email, this.signUpUser.email.toLowerCase());
    assert.equal(user.first_name, this.signUpUser.firstName);
    assert.equal(user.last_name, this.signUpUser.lastName);
    assert.equal(user.email_verified, false);
    assert.equal(user.has_verification_token, true);
  },
);

Then<ApiWorld>("the signup API rejects the password", async function () {
  assert.ok(this.signUpResponse, "Signup response was not captured.");
  assert.equal(this.signUpResponse.status(), 400);

  const payload = await json(this.signUpResponse);
  assert.match(String(payload.error || ""), /Password must be at least/i);
});

Then<ApiWorld>(
  "the signup API rejects the duplicate unverified account",
  async function () {
    assert.ok(this.signUpResponse, "Signup response was not captured.");
    assert.equal(this.signUpResponse.status(), 409);

    const payload = await json(this.signUpResponse);
    assert.match(String(payload.error || ""), /already exists/i);
    assert.match(String(payload.error || ""), /verification email/i);
  },
);

When<ApiWorld>(
  "I log into the signup API user's email account through the API and find the verification email",
  async function () {
    assert.ok(this.signUpUser, "Signup user was not prepared.");
    this.verificationEmail = await findLatestVerificationEmail(
      this.signUpUser.email,
    );
  },
);

When<ApiWorld>("the verification email sender should be correct", function () {
  assert.ok(this.verificationEmail?.from, "No verification email sender was captured.");
  assert.ok(
    this.verificationEmail.from.includes(expectedResendFromEmail()),
    `Expected sender to include ${expectedResendFromEmail()}, received ${this.verificationEmail.from}`,
  );
});

When<ApiWorld>(
  "I click the link in the verification email without using a browser",
  async function () {
    assert.ok(this.api, "API request context was not created.");
    assert.ok(
      this.verificationEmail?.verificationLink,
      "No verification link was found.",
    );

    const verificationUrl = new URL(this.verificationEmail.verificationLink);
    const email = verificationUrl.searchParams.get("email");
    const token = verificationUrl.searchParams.get("token");

    assert.ok(email, "Verification link did not include an email parameter.");
    assert.ok(token, "Verification link did not include a token parameter.");

    this.verificationResponse = await this.api.get("/api/auth/verify-email", {
      params: { email, token },
    });
  },
);

Then<ApiWorld>(
  "the verification link should respond with a success status",
  async function () {
    assert.ok(
      this.verificationResponse,
      "Verification response was not captured.",
    );
    assert.equal(this.verificationResponse.status(), 200);
  },
);
