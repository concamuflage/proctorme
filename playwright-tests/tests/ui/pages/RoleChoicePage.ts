import { expect, type Locator, type Page } from "@playwright/test";

export class RoleChoicePage {
  readonly page: Page;
  readonly heading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "What do you want to do?" });
  }

  async waitForLoaded() {
    await expect(this.page).toHaveURL(/\/account\/role-choice/, { timeout: 15_000 });
    await expect(this.heading).toBeVisible();
  }
}
