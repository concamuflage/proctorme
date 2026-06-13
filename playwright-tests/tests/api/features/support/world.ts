import {
  After,
  AfterAll,
  Before,
  setDefaultTimeout,
  setWorldConstructor,
} from "@cucumber/cucumber";
import {
  request,
  type APIRequestContext,
  type APIResponse,
} from "@playwright/test";
import { cleanupRatingScenario } from "./db";
import { endTestDbPool } from "../../../support/database/databasePool";
import { deleteUserByEmail } from "../../../support/database/databaseCleanup";
import type { VerificationEmail } from "../../../support/gmailVerificationClient";
import { AuthApi } from "../../apis/AuthApi";
import { SignupApi, type SignupBody } from "../../apis/SignupApi";

// ApiWorld is the shared state object for one API scenario.
//
// Cucumber creates a fresh ApiWorld instance for every Scenario. Step
// definitions read and write values on `this`, so one step can prepare data and
// a later step can use it.

/**
 * Stores per-scenario API test state, request context, and helper clients.
 */
export class ApiWorld {
  // Base URL for Playwright API requests. Tests default to the local Next app.
  baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

  // Shared test data for the booking-rating API scenario.
  password = "TestPassword123!";
  proctorUserId = 3;
  email = `institution-rating-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  institutionUserId: number | null = null;
  bookingIds: Record<string, number> = {};
  rawBookingIds: number[] = [];

  // Stores API responses by name when a scenario needs to assert them later.
  responses: Record<string, APIResponse> = {};

  // Shared test data for signup and credentials sign-in scenarios.
  signUpUser: SignupBody | null = null;
  signUpResponse: APIResponse | null = null;
  verificationEmail: VerificationEmail | null = null;
  verificationResponse: APIResponse | null = null;
  loginResponse: APIResponse | null = null;

  // Playwright APIRequestContext is the HTTP client used by API tests.
  // It is created before each scenario and disposed after each scenario.
  api: APIRequestContext | null = null;

  // API helper clients are created once per scenario from the shared request context.
  authApi!: AuthApi;
  signupApi!: SignupApi;
}

// Give each step up to 30 seconds before Cucumber marks it as timed out.
setDefaultTimeout(30_000);

// Tell Cucumber to use ApiWorld as `this` inside API step definitions.
setWorldConstructor(ApiWorld);

// Before every scenario, create a fresh API request context and API clients.
Before<ApiWorld>(async function () {
  this.api = await request.newContext({ baseURL: this.baseURL });
  this.authApi = new AuthApi(this.api);
  this.signupApi = new SignupApi(this.api);
});

// After every scenario
After<ApiWorld>(async function () {
  await cleanupRatingScenario(this.email, this.rawBookingIds);
  await deleteUserByEmail(this.signUpUser?.email);
  await this.api?.dispose(); // close the API request context.
});

// After the whole API test run, close the shared Postgres pool.
AfterAll(async function () {
  await endTestDbPool();
});
