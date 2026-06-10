import type { Locator, Page } from "@playwright/test";

/**
 * Represents the login page abstraction used by this project.
 */
export class LoginPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly forgotPasswordLink: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly noticeMessage: Locator;
  readonly resendVerificationButton: Locator;
  readonly createAccountLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Welcome back" });
    this.emailInput = page.locator("#login-email");
    this.passwordInput = page.locator("#login-password");
    this.forgotPasswordLink = page.getByRole("link", { name: "Forgot password?" });
    this.submitButton = page.locator("#login-submit");
    this.errorMessage = page.locator("#login-error");
    this.noticeMessage = page.locator("#login-notice");
    this.resendVerificationButton = page.getByRole("button", { name: /Resend verification email|Sending verification email/ });
    this.createAccountLink = page.getByRole("link", { name: "Create an account" });
  }

  /**
   * Runs the goto logic for this module.
   *
   * @param callbackUrl - Input used by goto.
   *
   * @returns The result used by the surrounding flow.
   */
  async goto(callbackUrl?: string) {
    const url = callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/login";
    await this.page.goto(url);
  }

  /**
   * Runs the fill email logic for this module.
   *
   * @param email - Input used by fill email.
   *
   * @returns The result used by the surrounding flow.
   */
  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  /**
   * Runs the fill password logic for this module.
   *
   * @param password - Input used by fill password.
   *
   * @returns The result used by the surrounding flow.
   */
  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  /**
   * Runs the fill form logic for this module.
   *
   * @param email - Input used by fill form.
   * @param password - Input used by fill form.
   *
   * @returns The result used by the surrounding flow.
   */
  async fillForm(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
  }

  /**
   * Runs the submit logic for this module.
   *
   * @returns The result used by the surrounding flow.
   */
  async submit() {
    await this.submitButton.click();
  }

  /**
   * Runs the login logic for this module.
   *
   * @param email - Input used by login.
   * @param password - Input used by login.
   *
   * @returns The result used by the surrounding flow.
   */
  async login(email: string, password: string) {
    await this.fillForm(email, password);
    await this.submit();
  }

  /**
   * Runs the resend verification email logic for this module.
   *
   * @returns The result used by the surrounding flow.
   */
  async resendVerificationEmail() {
    await this.resendVerificationButton.click();
  }
}
