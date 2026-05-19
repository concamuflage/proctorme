import type { Locator, Page } from "@playwright/test";

type SignupDetails = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword?: string;
};

export class SignupPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;
  readonly resendVerificationButton: Locator;
  readonly signInLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole("heading", { name: "Create your account" });
    this.firstNameInput = page.locator("#signup-first-name");
    this.lastNameInput = page.locator("#signup-last-name");
    this.emailInput = page.locator("#signup-email");
    this.passwordInput = page.locator("#signup-password");
    this.confirmPasswordInput = page.locator("#signup-confirm-password");
    this.submitButton = page.locator("#signup-submit");
    this.errorMessage = page.locator("#signup-error");
    this.successMessage = page.locator("#signup-success");
    this.resendVerificationButton = page.getByRole("button", { name: /Resend verification email|Sending verification email/ });
    this.signInLink = page.getByRole("link", { name: "Sign in" });
  }

  async goto() {
    await this.page.goto("/signup");
  }

  async fillFirstName(firstName: string) {
    await this.firstNameInput.fill(firstName);
  }

  async fillLastName(lastName: string) {
    await this.lastNameInput.fill(lastName);
  }

  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  async fillConfirmPassword(confirmPassword: string) {
    await this.confirmPasswordInput.fill(confirmPassword);
  }

  async fillForm(details: SignupDetails) {
    await this.fillFirstName(details.firstName);
    await this.fillLastName(details.lastName);
    await this.fillEmail(details.email);
    await this.fillPassword(details.password);
    await this.fillConfirmPassword(details.confirmPassword ?? details.password);
  }

  async submit() {
    await this.submitButton.click();
  }

  async signup(details: SignupDetails) {
    await this.fillForm(details);
    await this.submit();
  }

  async resendVerificationEmail() {
    await this.resendVerificationButton.click();
  }
}
