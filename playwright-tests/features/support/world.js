const { After, Before, setWorldConstructor } = require("@cucumber/cucumber");
const { request } = require("@playwright/test");
const { cleanupRatingScenario } = require("./db");

class RatingWorld {
  constructor() {
    this.baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
    this.password = "TestPassword123!";
    this.proctorUserId = 3;
    this.email = `institution-rating-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
    this.bookingIds = {};
    this.rawBookingIds = [];
    this.responses = {};
    this.api = null;
  }
}

setWorldConstructor(RatingWorld);

Before(async function () {
  this.api = await request.newContext({ baseURL: this.baseURL });
});

After(async function () {
  await cleanupRatingScenario(this.email, this.rawBookingIds);
  await this.api?.dispose();
});
