import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Represents the verify email page abstraction used by this project.
 */
export class VerifyEmailPage {
  readonly page: Page;
  readonly successHeading: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.successHeading = page.getByRole("heading", { name: "Email verified" });
    this.successMessage = page.getByText("Email verified successfully", { exact: false });
  }

  /**
   * Runs the wait for successful verification logic for this module.
   *
   * @returns The result used by the surrounding flow.
   */
  async waitForSuccessfulVerification() {
    await expect(this.successHeading).toBeVisible();
    await expect(this.successMessage).toBeVisible();
  }
}
