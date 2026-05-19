/**
 * E2E Test: Signup → Email Verification → Login Flow
 *
 * This test verifies that:
 * 1) A user can sign up with a new email
 * 2) The user cannot log in before verifying their email
 * 3) A verification email is sent to the user
 * 4) The user can verify their email via the link
 * 5) Login fails with incorrect password
 * 6) Login succeeds after verification with correct credentials
 *
 * External systems involved:
 * - Database cleanup (delete test user after test)
 * - Gmail API (fetch verification email)
 */
import { expect, test } from "@playwright/test";
import { LoginPage } from "../pages/LoginPage";
import { SignupPage } from "../pages/SignupPage";
import { deleteUserByEmail } from "../support/databaseCleanup";
import { findLatestVerificationEmail } from "../support/gmailVerificationClient";
import { expectedResendFromEmail, generateGmailAlias } from "../support/testEnv";

// Group of tests covering the full signup → verification → login lifecycle
test.describe("signup email verification login flow", () => {
  // Will store a unique email for each test run (using Gmail aliasing)
  let generatedEmail: string | null = null;

  // Cleanup: remove the test user from database after each test to keep environment clean
  test.afterEach(async () => {
    await deleteUserByEmail(generatedEmail);
    generatedEmail = null;
  });

  // Main test: validates complete flow including negative and positive scenarios
  test("user cannot login without verifying their email address", async ({ page, baseURL }) => {
    // Page Object for interacting with the signup page
    const signupPage = new SignupPage(page);
    // Page Object for interacting with the login page
    const loginPage = new LoginPage(page);
    // Define a valid password for the test user
    const password = "StrongPass123A";
    // Generate a unique email using Gmail aliasing to avoid conflicts between test runs
    generatedEmail = generateGmailAlias("concamuflage@gmail.com");

    // Step 1: Navigate to signup page
    await signupPage.goto();
    await expect(signupPage.heading).toBeVisible();

    // Step 2: Fill signup form and submit
    await signupPage.signup({
      firstName: "UI",
      lastName: "Tester",
      email: generatedEmail,
      password,
    });
    // Verify that signup was successful and user is prompted to verify email
    await expect(signupPage.successMessage).toHaveText("Check your email to verify your account before signing in.");

    // Step 3: Navigate to login page
    await loginPage.goto();
    await expect(loginPage.heading).toBeVisible();

    // Attempt login before email verification
    await loginPage.login(generatedEmail, password);
    // Verify that login is blocked until email is verified
    await expect(loginPage.errorMessage).toHaveText("Please verify your email before signing in.");

    // Wait for email delivery (simulates real-world delay)
    await page.waitForTimeout(10_000);
    // Fetch the latest verification email via Gmail API
    const verificationEmail = await findLatestVerificationEmail(generatedEmail);
    // Verify email sender is correct
    expect(verificationEmail.from.toLowerCase()).toContain(expectedResendFromEmail().toLowerCase());

    // Extract verification link from email
    const verificationUrl = new URL(verificationEmail.verificationLink);
    const currentBaseUrl = new URL(baseURL ?? "http://localhost:3000");
    // Step 4: Simulate user clicking verification link
    await page.goto(`${currentBaseUrl.origin}${verificationUrl.pathname}${verificationUrl.search}`);
    // Verify email verification success page is displayed
    await expect(page.getByRole("heading", { name: "Email verified" })).toBeVisible();
    await expect(page.getByText(/Email verified successfully|Email verified/i)).toBeVisible();

    await loginPage.goto();
    await expect(loginPage.heading).toBeVisible();
    // Attempt login with incorrect password after verification
    await loginPage.login(generatedEmail, "StrongPass123B");
    // Verify login fails with wrong credentials
    await expect(loginPage.errorMessage).toHaveText("Invalid credentials");

    // Step 5: Attempt login with correct credentials after verification
    await loginPage.goto();
    await expect(loginPage.heading).toBeVisible();
    await loginPage.login(generatedEmail, password);
    // Verify successful login redirects to products page
    await expect(page).toHaveURL(/\/products(?:\?|$)/);
    // Verify products page UI is loaded correctly
    await expect(page.getByTestId("products-filter-all")).toBeVisible();
  });
});
