
// create a custom Cucumber World object to store state between steps in a scenario

const { After, Before, setWorldConstructor } = require("@cucumber/cucumber");
const { request } = require("@playwright/test");
const { cleanupRatingScenario } = require("./db");

// Defines the custom Cucumber World object used by each rating scenario.
class RatingWorld {
  constructor() {
    // Base URL used by Playwright API requests. It can be overridden through an environment variable.
    this.baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

    // Default password used for seeded institution users in rating tests.
    this.password = "TestPassword123!";

    // Existing proctor user id used when creating test bookings.
    this.proctorUserId = 3;

    // Generate a unique email for each scenario so test users do not conflict with each other.
    this.email = `institution-rating-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;

    // Stores named booking ids that can be reused across steps in the same scenario.
    this.bookingIds = {};

    // Stores all created booking ids so they can be cleaned up after the scenario finishes.
    this.rawBookingIds = [];

    // Stores API responses from steps so later assertions can inspect them.
    this.responses = {};

    // Playwright API request context. It is created before each scenario and disposed after each scenario.
    this.api = null;
  }
}

// Tell Cucumber to create a new RatingWorld instance for every scenario.
setWorldConstructor(RatingWorld);

// Runs before each scenario and creates a Playwright API context for HTTP requests.
// this is like a reusable request configuration that can be used across multiple steps in the same scenario.
Before(async function () {
  this.api = await request.newContext({ baseURL: this.baseURL });
});

// Runs after each scenario to remove test data and close the Playwright API context.
After(async function () {
  await cleanupRatingScenario(this.email, this.rawBookingIds);
  await this.api?.dispose();
});
