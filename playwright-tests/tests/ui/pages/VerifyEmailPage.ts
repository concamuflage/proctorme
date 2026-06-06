import { expect, type Locator, type Page } from "@playwright/test";

export class VerifyEmailPage {
  readonly page: Page;
  readonly successHeading: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.successHeading = page.getByRole("heading", { name: "Email verified" });
    this.successMessage = page.getByText("Email verified successfully", { exact: false });
  }

  async waitForSuccessfulVerification() {
    await expect(this.successHeading).toBeVisible();
    await expect(this.successMessage).toBeVisible();
  }
}
