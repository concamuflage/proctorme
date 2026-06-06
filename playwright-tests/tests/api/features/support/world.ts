import { After, AfterAll, Before, setDefaultTimeout, setWorldConstructor } from "@cucumber/cucumber";
import { request, type APIRequestContext, type APIResponse } from "@playwright/test";
import { cleanupRatingScenario } from "./db";
import { endTestDbPool } from "../../../support/databasePool";

export class RatingWorld {
  baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
  password = "TestPassword123!";
  proctorUserId = 3;
  email = `institution-rating-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  institutionUserId: number | null = null;
  bookingIds: Record<string, number> = {};
  rawBookingIds: number[] = [];
  responses: Record<string, APIResponse> = {};
  api: APIRequestContext | null = null;
}

setDefaultTimeout(30_000);
setWorldConstructor(RatingWorld);

Before<RatingWorld>(async function () {
  this.api = await request.newContext({ baseURL: this.baseURL });
});

After<RatingWorld>(async function () {
  await cleanupRatingScenario(this.email, this.rawBookingIds);
  await this.api?.dispose();
});

AfterAll(async function () {
  await endTestDbPool();
});
