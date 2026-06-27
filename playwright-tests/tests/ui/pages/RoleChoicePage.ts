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
   * Waits for role choice and verifies that a roleless user has no profile navigation.
   *
   * @returns Nothing after the role-choice heading is visible and the profile link is absent.
   */
  async waitForLoaded() {
    await expect(this.page).toHaveURL(/\/account\/role-choice/, { timeout: 15_000 });
    await expect(this.heading).toBeVisible();
    // Example: Sign out remains available, while the "Open profile" icon is hidden until a role is selected.
    await expect(this.page.getByRole("link", { name: "Open profile" })).toHaveCount(0);
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
