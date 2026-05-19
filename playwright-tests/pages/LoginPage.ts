import type { Locator, Page } from "@playwright/test";

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

  async goto(callbackUrl?: string) {
    const url = callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/login";
    await this.page.goto(url);
  }

  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  async fillForm(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
  }

  async submit() {
    await this.submitButton.click();
  }

  async login(email: string, password: string) {
    await this.fillForm(email, password);
    await this.submit();
  }

  async resendVerificationEmail() {
    await this.resendVerificationButton.click();
  }
}
