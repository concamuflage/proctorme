import assert from "node:assert/strict";
import { Given, Then, When } from "@cucumber/cucumber";
import type { APIResponse } from "@playwright/test";
import { LoginApi } from "../../apis/LoginApi";
import { SignupApi, type SignupBody } from "../../apis/SignupApi";
import { generateGmailAlias } from "../../../support/emailTestData";
import {
  expectedResendFromEmail,
  findLatestVerificationEmail,
} from "../../../support/gmailVerificationClient";
import { userVerificationStatus } from "../support/authDb";
import type { ApiWorld } from "../support/world";

const password = "TestPassword123!";

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
 * Runs the new signup user logic for this module.
 *
 * @returns The result used by the surrounding flow.
 */
function newSignupUser(): SignupBody {
  return {
    firstName: "Api",
    lastName: "Signup",
    email: generateGmailAlias(
      process.env.TEST_GMAIL_BASE_EMAIL || "concamuflage@gmail.com",
    ),
    password,
  };
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

Given<ApiWorld>("I have a new signup API user", async function () {
  this.signUpUser = newSignupUser();
});

Given<ApiWorld>(
  "I have already signed up through the signup API",
  async function () {
    this.signUpUser = newSignupUser();
    this.signUpResponse = await signupApi(this).signup(this.signUpUser);
    assert.equal(this.signUpResponse.status(), 201);
  },
);

When<ApiWorld>("I submit the signup API request", async function () {
  assert.ok(this.signUpUser, "Signup user was not prepared.");
  this.signUpResponse = await signupApi(this).signup(this.signUpUser);
});

When<ApiWorld>(
  "I submit the signup API request with a weak password",
  async function () {
    assert.ok(this.signUpUser, "Signup user was not prepared.");
    this.signUpResponse = await signupApi(this).signup({
      ...this.signUpUser,
      password: "weak",
    });
  },
);

When<ApiWorld>("I submit the signup API request again", async function () {
  assert.ok(this.signUpUser, "Signup user was not prepared.");
  this.signUpResponse = await signupApi(this).signup(this.signUpUser);
});

Then<ApiWorld>(
  "the signup API responds with created account details",
  async function () {
    assert.ok(this.signUpUser, "Signup user was not prepared.");
    assert.ok(this.signUpResponse, "Signup response was not captured.");
    assert.equal(this.signUpResponse.status(), 201);

    const payload = await json(this.signUpResponse);
    assert.equal(payload.email, this.signUpUser.email.toLowerCase());
    assert.equal(payload.firstName, this.signUpUser.firstName);
    assert.equal(payload.lastName, this.signUpUser.lastName);
    assert.equal(
      payload.message,
      "Check your email to verify your account before signing in.",
    );
  },
);

Then<ApiWorld>(
  "the signup API user is stored as unverified",
  async function () {
    assert.ok(this.signUpUser, "Signup user was not prepared.");
    assert.equal(await userVerificationStatus(this.signUpUser.email), false);
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

