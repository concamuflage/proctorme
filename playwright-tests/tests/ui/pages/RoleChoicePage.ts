import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Represents the role choice page abstraction used by this project.
 */
export class RoleChoicePage {
  readonly page: Page;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "What do you want to do?" });
  }

  /**
   * Runs the wait for loaded logic for this module.
   *
   * @returns The result used by the surrounding flow.
   */
  async waitForLoaded() {
    await expect(this.page).toHaveURL(/\/account\/role-choice/, { timeout: 15_000 });
    await expect(this.heading).toBeVisible();
  }

  /**
   * Clicks the proctor role choice.
   *
   * @returns Nothing after the browser starts navigating to the proctor application route.
   */
  async chooseProctorRole() {
    await this.page.getByRole("link", { name: "Become a proctor" }).click();
  }
}
