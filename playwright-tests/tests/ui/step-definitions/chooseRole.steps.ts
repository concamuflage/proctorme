import assert from "node:assert/strict";
import { Given, Then, When } from "@cucumber/cucumber";
import { findLatestVerificationEmail } from "../../support/gmailVerificationClient";
import { newSignupUser } from "../../support/signupTestData";
import type { UiWorld } from "../support/world";

When<UiWorld>(
  "I have already signed up through the signup API",
  async function () {
    this.signUpUser = newSignupUser();
    this.signUpResponse = await this.signupApi.signup(this.signUpUser);
    assert.equal(this.signUpResponse.status(), 201);
  },
);

And<UiWorld>(
  "I verify the email address",
  async function () {
    this.verificationEmail = await findLatestVerificationEmail(this.generatedEmail!);
    assert(this.verificationEmail, "Expected to find a verification email but did not.");
    const verificationUrl = new URL(this.verificationEmail.verificationLink);
    const email = verificationUrl.searchParams.get("email");
    const token = verificationUrl.searchParams.get("token");
    this.verificationResponse = await this.api.get("/api/auth/verify-email", {
      params: { email, token },
    });
  },
);

And<UiWorld>(
  "And I login with the new account",
    await loginPage(this).login(this.generatedEmail, password);
);
