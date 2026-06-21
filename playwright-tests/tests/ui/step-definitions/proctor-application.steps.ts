import assert from "node:assert/strict";
import { Then, When } from "@cucumber/cucumber";
import { ProctorApplicationPage } from "../pages/ProctorApplicationPage";
import { RoleChoicePage } from "../pages/RoleChoicePage";
import type { UiWorld } from "../support/world";

/**
 * Creates a proctor application page object for the active UI scenario.
 *
 * @param world - Current UI scenario world containing the active browser page.
 *
 * @returns Proctor application page object for the active browser page.
 */
function proctorApplicationPage(world: UiWorld) {
  assert.ok(world.page, "Page was not created.");
  return new ProctorApplicationPage(world.page);
}

/**
 * Creates a role choice page object for the active UI scenario.
 *
 * @param world - Current UI scenario world containing the active browser page.
 *
 * @returns Role choice page object for the active browser page.
 */
function roleChoicePage(world: UiWorld) {
  assert.ok(world.page, "Page was not created.");
  return new RoleChoicePage(world.page);
}

When<UiWorld>(
  "I choose to become a proctor",
  async function () {
    await roleChoicePage(this).chooseProctorRole();
  },
);

Then<UiWorld>(
  "I should be asked to choose a role",
  async function () {
    await roleChoicePage(this).waitForLoaded();
  },
);

When<UiWorld>(
  "I choose \"Become a Proctor\"",
  async function () {
    await roleChoicePage(this).chooseProctorRole();
  },
);

Then<UiWorld>(
  "I should land on the proctor application page",
  async function () {
    await proctorApplicationPage(this).waitForLoaded();
  },
);

Then<UiWorld>(
  "I should see the profile basics step",
  async function () {
    await proctorApplicationPage(this).expectStep("Profile basics");
  },
);

When<UiWorld>(
  "I complete profile basics with listed options",
  async function () {
    await proctorApplicationPage(this).completeProfileBasics();
  },
);

When<UiWorld>(
  "I continue to the next proctor application step",
  async function () {
    await proctorApplicationPage(this).continueToNextStep();
  },
);

Then<UiWorld>(
  "I should see the current address step",
  async function () {
    await proctorApplicationPage(this).expectStep("Current address");
  },
);

When<UiWorld>(
  "I complete the current address with listed location options",
  async function () {
    await proctorApplicationPage(this).completeCurrentAddress();
  },
);

Then<UiWorld>(
  "I should see the rates and session length step",
  async function () {
    await proctorApplicationPage(this).expectStep("Rates and session length");
  },
);

When<UiWorld>(
  "I complete rates and session length",
  async function () {
    await proctorApplicationPage(this).completeRatesAndSessionLength();
  },
);

Then<UiWorld>(
  "I should see the education step",
  async function () {
    await proctorApplicationPage(this).expectStep("Education");
  },
);

When<UiWorld>(
  "I complete education with listed degree, school, and major",
  async function () {
    await proctorApplicationPage(this).completeEducation();
  },
);

When<UiWorld>(
  "I upload a valid diploma file",
  async function () {
    await proctorApplicationPage(this).uploadDiplomaFile();
  },
);

When<UiWorld>(
  "I leave school email blank",
  async function () {
    await proctorApplicationPage(this).leaveSchoolEmailBlank();
  },
);

When<UiWorld>(
  "I authorize education verification",
  async function () {
    await proctorApplicationPage(this).authorizeEducationVerification();
  },
);

Then<UiWorld>(
  "I should see the identity and profile media step",
  async function () {
    await proctorApplicationPage(this).expectStep("Identity and profile media");
  },
);

When<UiWorld>(
  "I upload a valid government ID file",
  async function () {
    await proctorApplicationPage(this).uploadGovernmentIdFile();
  },
);

When<UiWorld>(
  "I upload a valid profile image file",
  async function () {
    await proctorApplicationPage(this).uploadProfileImageFile();
  },
);

When<UiWorld>(
  "I submit the proctor application",
  async function () {
    await proctorApplicationPage(this).submitApplication();
  },
);

Then<UiWorld>(
  "the proctor application should be submitted for admin review",
  async function () {
    await proctorApplicationPage(this).expectSubmittedForAdminReview();
  },
);
