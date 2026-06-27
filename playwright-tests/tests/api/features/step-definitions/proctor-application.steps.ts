import assert from "node:assert/strict";
import { Given, Then, When } from "@cucumber/cucumber";
import type { APIResponse } from "@playwright/test";
import {
  ProctorApplicationApi,
  type ProctorApplicationRequest,
} from "../../apis/ProctorApplicationApi";
import { createVerifiedUserWithNoRoles } from "../../../support/authSetup";
import {
  findProctorApplicationByEmail,
  type StoredProctorApplication,
} from "../support/db";
import type { ApiWorld } from "../support/world";

type ProctorApplicationOptions = {
  professions?: string[];
  genders?: string[];
  ethnicities?: string[];
  states?: Array<{ name: string; code: string }>;
  degrees?: string[];
  schools?: string[];
  majors?: string[];
  timezones?: string[];
};

type ProctorApplicationScenarioState = {
  client: ProctorApplicationApi;
  requestPayload: Partial<ProctorApplicationRequest> | null;
  response: APIResponse | null;
  lockedApplicationBeforeChange: StoredProctorApplication | null;
};

const scenarioStates = new WeakMap<ApiWorld, ProctorApplicationScenarioState>();

/**
 * Returns state isolated to one proctor application API scenario.
 *
 * @param world - Current Cucumber world containing the authenticated request context.
 * @returns Mutable scenario state, for example the payload prepared by a Given step and consumed by a When step.
 */
function scenarioState(world: ApiWorld) {
  let state = scenarioStates.get(world);
  if (!state) {
    assert.ok(world.requestContext, "API request context was not created.");
    state = {
      client: new ProctorApplicationApi(world.requestContext),
      requestPayload: null,
      response: null,
      lockedApplicationBeforeChange: null,
    };
    scenarioStates.set(world, state);
  }
  return state;
}

/**
 * Selects the first non-empty, non-custom value supplied by the application options API.
 *
 * @param values - Listed values, for example professions returned by the options endpoint.
 * @param optionName - Name included in assertion failures, for example `profession`.
 * @returns A listed option that is not `Other`.
 */
function firstListedOption(values: string[] | undefined, optionName: string) {
  const value = values?.find((candidate) => candidate.trim() && candidate !== "Other");
  assert.ok(value, `Expected at least one listed ${optionName} option.`);
  return value;
}

/**
 * Builds a complete valid application from options exposed by the authenticated API.
 *
 * @param world - Current Cucumber world whose request context already has a signed-in user.
 * @returns A valid request payload using listed dropdown values and reusable non-uploading file URLs.
 */
async function buildValidApplicationPayload(world: ApiWorld): Promise<ProctorApplicationRequest> {
  const client = scenarioState(world).client;
  const optionsResponse = await client.options();
  assert.equal(optionsResponse.status(), 200);
  const options = await optionsResponse.json() as ProctorApplicationOptions;

  const state = options.states?.find((candidate) => candidate.code.trim());
  assert.ok(state, "Expected at least one listed state option.");
  const citiesResponse = await client.cities(state.code);
  assert.equal(citiesResponse.status(), 200);
  const citiesPayload = await citiesResponse.json() as { cities?: string[] };

  return {
    profession: firstListedOption(options.professions, "profession"),
    gender: firstListedOption(options.genders, "gender"),
    ethnicity: firstListedOption(options.ethnicities, "ethnicity"),
    dateOfBirth: "1990-01-01",
    bio: "This API test applicant has enough experience to support secure and consistent remote exam sessions.",
    street: "100 Test Avenue",
    city: firstListedOption(citiesPayload.cities, "city"),
    state: state.code,
    country: "United States",
    zipCode: "02118",
    timezone: firstListedOption(options.timezones, "timezone"),
    hourlyRate: 30,
    minimumHours: 1,
    maximumHours: 2,
    education: [
      {
        degree: firstListedOption(options.degrees, "degree"),
        school: firstListedOption(options.schools, "school"),
        major: firstListedOption(options.majors, "major"),
        startMonth: "2015-09",
        endMonth: "2019-05",
        diplomaUrl: "gcs://test-fixtures/proctor-application/diploma.pdf",
        schoolEmail: "",
        educationVerificationAuthorized: true,
        schoolEmailVerificationStatus: "not_provided",
      },
    ],
    imageUrls: ["gcs://test-fixtures/proctor-application/profile.png"],
    governmentIdUrls: ["gcs://test-fixtures/proctor-application/government-id.pdf"],
  };
}

Given<ApiWorld>("I have a verified proctor application API user", async function () {
  this.signUpUser = await createVerifiedUserWithNoRoles(this.baseURL);
});

Given<ApiWorld>("the proctor application API user is signed in", async function () {
  assert.ok(this.signUpUser, "Proctor application API user was not prepared.");
  const response = await this.authApi.signInWithCredentials({
    email: this.signUpUser.email,
    password: this.signUpUser.password,
  });
  assert.equal(response.status(), 200);
});

Given<ApiWorld>("I have an incomplete proctor application payload", async function () {
  const optionsResponse = await scenarioState(this).client.options();
  assert.equal(optionsResponse.status(), 200);
  const options = await optionsResponse.json() as ProctorApplicationOptions;
  scenarioState(this).requestPayload = {
    profession: firstListedOption(options.professions, "profession"),
  };
});

When<ApiWorld>("I save the proctor application draft through the API", async function () {
  const state = scenarioState(this);
  assert.ok(state.requestPayload, "Proctor application draft payload was not prepared.");
  state.response = await state.client.saveDraft(state.requestPayload);
});

Then<ApiWorld>("the proctor application draft is saved", async function () {
  const response = scenarioState(this).response;
  assert.ok(response, "Proctor application draft response was not captured.");
  assert.equal(response.status(), 200);
  const payload = await response.json() as Record<string, unknown>;
  const application = payload.application as Record<string, unknown> | undefined;
  assert.equal(application?.status, "draft");
});

Then<ApiWorld>("the saved proctor application has draft status", async function () {
  assert.ok(this.signUpUser, "Proctor application API user was not prepared.");
  const application = await findProctorApplicationByEmail(this.signUpUser.email);
  assert.ok(application, "Saved proctor application was not found in the database.");
  assert.equal(application.status, "draft");
});

Given<ApiWorld>("I have a proctor application draft with a non-education school email address", async function () {
  const payload = await buildValidApplicationPayload(this);
  payload.education[0].schoolEmail = "student@example.com";
  payload.education[0].schoolEmailVerificationStatus = "pending";
  scenarioState(this).requestPayload = payload;
});

Then<ApiWorld>("the proctor application API rejects the school email address", async function () {
  const response = scenarioState(this).response;
  assert.ok(response, "School email validation response was not captured.");
  assert.equal(response.status(), 400);
});

Then<ApiWorld>("the response identifies the school email validation error", async function () {
  const response = scenarioState(this).response;
  assert.ok(response, "School email validation response was not captured.");
  const payload = await response.json() as Record<string, unknown>;
  assert.equal(payload.errorCode, "INVALID_SCHOOL_EMAIL");
  assert.equal(payload.error, "School email address must end with .edu.");
});

Then<ApiWorld>("the invalid proctor application draft is not saved", async function () {
  assert.ok(this.signUpUser, "Proctor application API user was not prepared.");
  assert.equal(await findProctorApplicationByEmail(this.signUpUser.email), null);
});

Given<ApiWorld>("I have a complete proctor application payload with one invalid form section", async function () {
  const payload = await buildValidApplicationPayload(this);
  // Leave one required address value blank so the API must identify Step 2 rather than a specific test-data string.
  payload.street = "";
  scenarioState(this).requestPayload = payload;
});

When<ApiWorld>("I submit the proctor application through the API", async function () {
  const state = scenarioState(this);
  assert.ok(state.requestPayload, "Proctor application submission payload was not prepared.");
  state.response = await state.client.submit(state.requestPayload as ProctorApplicationRequest);
});

Then<ApiWorld>("the proctor application API rejects the submission", async function () {
  const response = scenarioState(this).response;
  assert.ok(response, "Proctor application submission response was not captured.");
  assert.equal(response.status(), 400);
});

Then<ApiWorld>("the response identifies the invalid form section", async function () {
  const response = scenarioState(this).response;
  assert.ok(response, "Proctor application submission response was not captured.");
  const payload = await response.json() as Record<string, unknown>;
  // It does not verify that the UI navigates to Step 2. That belongs in a UI test because the API only returns the error code;
  //  the frontend maps that code to the step.
  assert.equal(payload.errorCode, "INVALID_CURRENT_ADDRESS");
});

Then<ApiWorld>("the invalid proctor application is not submitted", async function () {
  assert.ok(this.signUpUser, "Proctor application API user was not prepared.");
  assert.equal(await findProctorApplicationByEmail(this.signUpUser.email), null);
});

Given<ApiWorld>("I have a complete valid proctor application payload", async function () {
  scenarioState(this).requestPayload = await buildValidApplicationPayload(this);
});

Then<ApiWorld>("the proctor application is submitted", async function () {
  const response = scenarioState(this).response;
  assert.ok(response, "Proctor application submission response was not captured.");
  assert.equal(response.status(), 200);
  const payload = await response.json() as Record<string, unknown>;
  const application = payload.application as Record<string, unknown> | undefined;
  assert.equal(application?.status, "pending");
});

Then<ApiWorld>("the submitted proctor application has pending status", async function () {
  assert.ok(this.signUpUser, "Proctor application API user was not prepared.");
  const application = await findProctorApplicationByEmail(this.signUpUser.email);
  assert.ok(application, "Submitted proctor application was not found in the database.");
  assert.equal(application.status, "pending");
});

Given<ApiWorld>("I have a locked proctor application", async function () {
  const state = scenarioState(this);
  const payload = await buildValidApplicationPayload(this);
  const response = await state.client.submit(payload);
  assert.equal(response.status(), 200);
  state.requestPayload = {
    ...payload,
    bio: `${payload.bio} This rejected edit must not be stored.`,
  };
  assert.ok(this.signUpUser, "Proctor application API user was not prepared.");
  state.lockedApplicationBeforeChange = await findProctorApplicationByEmail(this.signUpUser.email);
  assert.ok(state.lockedApplicationBeforeChange, "Locked proctor application was not stored during setup.");
});

When<ApiWorld>("I try to change the locked proctor application through the API", async function () {
  const state = scenarioState(this);
  assert.ok(state.requestPayload, "Locked application change payload was not prepared.");
  state.response = await state.client.saveDraft(state.requestPayload);
});

Then<ApiWorld>("the proctor application API rejects the change as a conflict", async function () {
  const response = scenarioState(this).response;
  assert.ok(response, "Locked application response was not captured.");
  assert.equal(response.status(), 409);
  const payload = await response.json() as Record<string, unknown>;
  assert.equal(payload.error, "This proctor application is already pending or approved and cannot be edited.");
});

Then<ApiWorld>("the locked proctor application is unchanged", async function () {
  const state = scenarioState(this);
  assert.ok(this.signUpUser, "Proctor application API user was not prepared.");
  const applicationAfterChange = await findProctorApplicationByEmail(this.signUpUser.email);
  assert.deepEqual(applicationAfterChange, state.lockedApplicationBeforeChange);
});
