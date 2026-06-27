import path from "node:path";
import { expect, type Locator, type Page } from "@playwright/test";

const UPLOAD_FILES_DIR = path.resolve(process.cwd(), "tests/ui/support/uploadFiles");
const DIPLOMA_FILE_PATH = path.join(UPLOAD_FILES_DIR, "diploma.pdf");
const GOVERNMENT_ID_FILE_PATH = path.join(UPLOAD_FILES_DIR, "government_id.pdf");
const PROFILE_IMAGE_FILE_PATH = path.join(UPLOAD_FILES_DIR, "profile.png");

/**
 * Represents the proctor application page abstraction used by UI feature tests.
 */
export class ProctorApplicationPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly continueButton: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Proctor verification" });
    this.continueButton = page.getByRole("button", { name: "Continue" });
    this.submitButton = page.getByRole("button", { name: "Submit for admin review" });
  }

  /**
   * Waits for the proctor application route and heading to be visible.
   *
   * @returns Nothing after the page is ready for interaction.
   */
  async waitForLoaded() {
    await expect(this.page).toHaveURL(/\/account\/proctor-verification/, { timeout: 15_000 });
    await expect(this.heading).toBeVisible();
  }

  /**
   * Waits for a named application step to be visible.
   *
   * @param stepTitle - Visible step name, for example `Profile basics`.
   *
   * @returns Nothing after the requested step header is visible.
   */
  async expectStep(stepTitle: string) {
    await expect(this.page.getByText(new RegExp(`Step \\d+ of 5: ${escapeRegExp(stepTitle)}`))).toBeVisible();
  }

  /**
   * Completes the profile basics step with valid listed options.
   *
   * @returns Nothing after required profile basics controls have values.
   */
  async completeProfileBasics() {
    await this.selectFirstAvailableOption(this.page.getByLabel("Profession"));
    await this.selectFirstAvailableOption(this.page.getByLabel("Gender"), { avoidOther: true });
    await this.page.getByLabel("Date of birth").fill("1990-01-01");
    await this.selectFirstAvailableOption(this.page.getByLabel("Ethnicity"), { avoidOther: true });
    await this.page.getByLabel("Self-introduction").fill(
      "I have experience supporting remote exam sessions, checking identity documents, and keeping test environments consistent.",
    );
  }

  /**
   * Completes the address step using values from the app's listed state, city, and timezone options.
   *
   * @returns Nothing after required address controls have values.
   */
  async completeCurrentAddress() {
    await this.page.getByLabel("Street address").fill("123 Test Street");
    // Exact matching prevents the City placeholder "Select a state first" from also matching the State locator.
    // Example: `getByLabel("State", { exact: true })` resolves only the State select instead of two controls.
    await this.selectFirstAvailableOption(this.page.getByLabel("State", { exact: true }));
    await expect(this.page.getByLabel("City", { exact: true })).toBeEnabled();
    await this.selectFirstAvailableOption(this.page.getByLabel("City", { exact: true }), { avoidOther: true });
    await this.page.getByLabel("Zip code").fill("02118");
    await this.selectFirstAvailableOption(this.page.getByLabel("IANA timezone"));
  }

  /**
   * Completes the rates and session length step with valid numeric values.
   *
   * @returns Nothing after pricing controls have values.
   */
  async completeRatesAndSessionLength() {
    await this.page.getByLabel(/Hourly rate/).fill("30");
    await this.page.getByLabel("Minimum hours per session").fill("1");
    await this.page.getByLabel("Maximum hours per session").fill("2");
  }

  /**
   * Completes the education selectors and date range using listed options.
   *
   * @returns Nothing after required education controls have values.
   */
  async completeEducation() {
    await this.selectFirstAvailableOption(this.selectWithPlaceholder("Select a degree"), { avoidOther: true });
    await this.selectFirstAvailableOption(this.selectWithPlaceholder("Select a school"), { avoidOther: true });
    await this.selectFirstAvailableOption(this.selectWithPlaceholder("Select a major"), { avoidOther: true });

    const monthInputs = this.page.locator('input[type="month"]');
    await monthInputs.nth(0).fill("2015-09");
    await monthInputs.nth(1).fill("2019-05");
  }

  /**
   * Uploads the reusable diploma fixture and waits for the app to show the uploaded diploma link.
   *
   * @returns Nothing after the upload is visible in the form.
   */
  async uploadDiplomaFile() {
    await this.uploadFile("Diploma", DIPLOMA_FILE_PATH, "Diploma");
  }

  /**
   * Clears the optional school email field so email verification is not part of this scenario.
   *
   * @returns Nothing after the optional school email input is blank.
   */
  async leaveSchoolEmailBlank() {
    await this.page.getByPlaceholder("name@school.edu").fill("");
  }

  /**
   * Checks the education verification authorization checkbox.
   *
   * @returns Nothing after the authorization checkbox is checked.
   */
  async authorizeEducationVerification() {
    await this.page.getByLabel(/I authorize .* to verify this education record/).check();
  }

  /**
   * Uploads the reusable government ID fixture and waits for its uploaded link.
   *
   * @returns Nothing after the upload is visible in the form.
   */
  async uploadGovernmentIdFile() {
    await this.uploadFile("Government-issued ID", GOVERNMENT_ID_FILE_PATH, "Government ID");
  }

  /**
   * Uploads the reusable profile image fixture and waits for its uploaded link.
   *
   * @returns Nothing after the upload is visible in the form.
   */
  async uploadProfileImageFile() {
    await this.uploadFile("Profile images", PROFILE_IMAGE_FILE_PATH, "Image");
  }

  /**
   * Continues to the next application step.
   *
   * @returns Nothing after the app accepts the current step and advances.
   */
  async continueToNextStep() {
    await this.continueButton.click();
  }

  /**
   * Submits the completed proctor application.
   *
   * @returns Nothing after the submit action is sent.
   */
  async submitApplication() {
    await this.submitButton.click();
  }

  /**
   * Verifies the final application submission success notice.
   *
   * @returns Nothing after the submission notice is visible.
   */
  async expectSubmittedForAdminReview() {
    await expect(this.page.getByText("Application submitted. An admin will review your materials before your proctor profile is approved.")).toBeVisible({
      timeout: 15_000,
    });
  }

  /**
   * Selects the first usable option from a select control.
   *
   * @param select - Select element locator.
   * @param options - Selection rules, for example `{ avoidOther: true }` to skip custom free-text branches.
   *
   * @returns Nothing after an asynchronously loaded listed option has been selected.
   */
  private async selectFirstAvailableOption(select: Locator, options: { avoidOther?: boolean } = {}) {
    await expect(select).toBeVisible();
    let value = "";
    // Dropdowns render before their API-backed choices arrive, so poll the actual options instead of checking once.
    // Example: Profession initially contains only its blank placeholder, then receives listed professions after the options request completes.
    await expect.poll(async () => {
      value = await select.locator("option").evaluateAll((optionElements, avoidOther) => {
        for (const optionElement of optionElements) {
          const option = optionElement as HTMLOptionElement;
          const optionValue = option.value.trim();
          const label = option.textContent?.trim() ?? "";
          if (!optionValue || option.disabled) continue;
          if (avoidOther && (optionValue === "Other" || label === "Other")) continue;
          return optionValue;
        }
        return "";
      }, options.avoidOther === true);
      return value;
    }, {
      message: "Expected select control to contain at least one usable option.",
      timeout: 15_000,
    }).not.toBe("");

    await select.selectOption(value);
  }

  /**
   * Locates an unlabeled select by its placeholder option.
   *
   * @param placeholder - Placeholder option text, for example `Select a degree`.
   *
   * @returns The matching select locator.
   */
  private selectWithPlaceholder(placeholder: string) {
    return this.page.locator("select").filter({ has: this.page.locator("option", { hasText: placeholder }) }).first();
  }

  /**
   * Uploads a fixture through a named upload field and waits for the resulting link.
   *
   * @param fieldLabel - Visible upload field label, for example `Diploma`.
   * @param filePath - Absolute fixture path to upload.
   * @param uploadedLinkLabel - Expected uploaded file link label, for example `Diploma`.
   *
   * @returns Nothing after the uploaded file link is visible.
   */
  private async uploadFile(fieldLabel: string, filePath: string, uploadedLinkLabel: string) {
    const uploadField = this.uploadField(fieldLabel);
    await uploadField.locator('input[type="file"]').setInputFiles(filePath);
    await expect(uploadField.getByRole("link", { name: uploadedLinkLabel })).toBeVisible({ timeout: 15_000 });
  }

  /**
   * Locates the nearest upload field container for a visible upload label.
   *
   * @param fieldLabel - Visible upload field label, for example `Government-issued ID`.
   *
   * @returns The upload field container locator.
   */
  private uploadField(fieldLabel: string) {
    return this.page.locator(`xpath=//*[normalize-space()="${fieldLabel}"]/ancestor::div[.//input[@type="file"]][1]`);
  }
}

/**
 * Escapes user-visible text so it can be matched literally inside a regular expression.
 *
 * @param value - Text to escape, for example `Identity and profile media`.
 *
 * @returns A regular-expression-safe string.
 */
function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
