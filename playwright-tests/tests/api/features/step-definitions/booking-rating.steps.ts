import assert from "node:assert/strict";
import { Given, Then, When } from "@cucumber/cucumber";
import {
  ratingCountForBooking,
  seedBooking,
  seedInstitutionUser,
} from "../support/db";
import type { ApiWorld } from "../support/world";

Given<ApiWorld>("an institution user exists", async function () {
  this.institutionUserId = await seedInstitutionUser(this.email, this.password);
  assert.ok(this.institutionUserId > 0);
});

Given<ApiWorld>("the institution user has a completed booking and a normal booking for Avery Chen", async function () {
  this.bookingIds.completed = await seedBooking(this.proctorUserId, "completed");
  this.bookingIds.normal = await seedBooking(this.proctorUserId, "normal");
  this.rawBookingIds.push(this.bookingIds.completed, this.bookingIds.normal);

  assert.ok(this.bookingIds.completed > 0);
  assert.ok(this.bookingIds.normal > 0);
});

Given<ApiWorld>("the institution user is signed in", async function () {
  const loginResponse = await this.authApi.signInWithCredentials({
    email: this.email,
    password: this.password,
  });
  assert.equal(loginResponse.ok(), true);
});

When<ApiWorld>("the institution user rates the completed booking", async function () {
  assert.ok(this.requestContext, "API request context was not created.");
  this.responses.completed = await this.requestContext.post(`/api/bookings/${this.bookingIds.completed}/rating`, {
    data: {
      rating: 5,
      comment: "The proctor handled the completed session professionally.",
    },
  });
});

Then<ApiWorld>("the completed booking rating is saved", async function () {
  assert.equal(this.responses.completed.status(), 201);
  assert.equal(await ratingCountForBooking(this.bookingIds.completed), 1);
});

When<ApiWorld>("the institution user rates the normal booking", async function () {
  assert.ok(this.requestContext, "API request context was not created.");
  this.responses.normal = await this.requestContext.post(`/api/bookings/${this.bookingIds.normal}/rating`, {
    data: {
      rating: 4,
      comment: "This rating should not be accepted yet.",
    },
  });
});

Then<ApiWorld>("the normal booking rating is rejected", async function () {
  assert.equal(this.responses.normal.status(), 409);
  const payload = await this.responses.normal.json();
  assert.equal(payload.error, "Only completed bookings can be rated.");
});

Then<ApiWorld>("no rating is saved for the normal booking", async function () {
  assert.equal(await ratingCountForBooking(this.bookingIds.normal), 0);
});
