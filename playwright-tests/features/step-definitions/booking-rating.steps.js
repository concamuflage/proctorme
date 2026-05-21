const assert = require("node:assert/strict");
const { Given, Then, When } = require("@cucumber/cucumber");
const {
  ratingCountForBooking,
  seedBooking,
  seedInstitutionUser,
} = require("../support/db");

// Creates an institution user in the test database so the rating scenario has a valid user account.
Given("an institution user exists", async function () {
  // Store the seeded institution user's id on the Cucumber World for later steps, such as signing in.
  this.institutionUserId = await seedInstitutionUser(this.email, this.password);

  // Confirm that the seed helper successfully created a valid user record.
  assert.ok(this.institutionUserId > 0);
});

Given("the institution user has a completed booking and a normal booking for Avery Chen", async function () {
  this.bookingIds.completed = await seedBooking(this.proctorUserId, "completed");
  this.bookingIds.normal = await seedBooking(this.proctorUserId, "normal");
  this.rawBookingIds.push(this.bookingIds.completed, this.bookingIds.normal);

  assert.ok(this.bookingIds.completed > 0);
  assert.ok(this.bookingIds.normal > 0);
});

Given("the institution user is signed in", async function () {
  const csrfResponse = await this.api.get("/api/auth/csrf");
  assert.equal(csrfResponse.ok(), true);
  const csrfPayload = await csrfResponse.json();

  const loginResponse = await this.api.post("/api/auth/callback/credentials?json=true", {
    form: {
      csrfToken: csrfPayload.csrfToken,
      email: this.email,
      password: this.password,
      redirect: "false",
      callbackUrl: "/",
    },
  });

  assert.equal(loginResponse.ok(), true);
});

When("the institution user rates the completed booking", async function () {
  this.responses.completed = await this.api.post(`/api/bookings/${this.bookingIds.completed}/rating`, {
    data: {
      rating: 5,
      comment: "The proctor handled the completed session professionally.",
    },
  });
});

Then("the completed booking rating is saved", async function () {
  assert.equal(this.responses.completed.status(), 201);
  assert.equal(await ratingCountForBooking(this.bookingIds.completed), 1);
});

When("the institution user rates the normal booking", async function () {
  this.responses.normal = await this.api.post(`/api/bookings/${this.bookingIds.normal}/rating`, {
    data: {
      rating: 4,
      comment: "This rating should not be accepted yet.",
    },
  });
});

Then("the normal booking rating is rejected", async function () {
  assert.equal(this.responses.normal.status(), 409);
  const payload = await this.responses.normal.json();
  assert.equal(payload.error, "Only completed bookings can be rated.");
});

Then("no rating is saved for the normal booking", async function () {
  assert.equal(await ratingCountForBooking(this.bookingIds.normal), 0);
});
