import type { Locator, Page } from "@playwright/test";

type SignupDetails = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword?: string;
};

/**
 * Represents the signup page abstraction used by this project.
 */
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

  /**
   * Runs the goto logic for this module.
   *
   * @returns The result used by the surrounding flow.
   */
  async goto() {
    await this.page.goto("/signup");
  }

  /**
   * Runs the fill first name logic for this module.
   *
   * @param firstName - Input used by fill first name.
   *
   * @returns The result used by the surrounding flow.
   */
  async fillFirstName(firstName: string) {
    await this.firstNameInput.fill(firstName);
  }

  /**
   * Runs the fill last name logic for this module.
   *
   * @param lastName - Input used by fill last name.
   *
   * @returns The result used by the surrounding flow.
   */
  async fillLastName(lastName: string) {
    await this.lastNameInput.fill(lastName);
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
   * Runs the fill confirm password logic for this module.
   *
   * @param confirmPassword - Input used by fill confirm password.
   *
   * @returns The result used by the surrounding flow.
   */
  async fillConfirmPassword(confirmPassword: string) {
    await this.confirmPasswordInput.fill(confirmPassword);
  }

  /**
   * Runs the fill form logic for this module.
   *
   * @param details - Input used by fill form.
   *
   * @returns The result used by the surrounding flow.
   */
  async fillForm(details: SignupDetails) {
    await this.fillFirstName(details.firstName);
    await this.fillLastName(details.lastName);
    await this.fillEmail(details.email);
    await this.fillPassword(details.password);
    await this.fillConfirmPassword(details.confirmPassword ?? details.password);
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
   * Runs the signup logic for this module.
   *
   * @param details - Input used by signup.
   *
   * @returns The result used by the surrounding flow.
   */
  async signup(details: SignupDetails) {
    await this.fillForm(details);
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
