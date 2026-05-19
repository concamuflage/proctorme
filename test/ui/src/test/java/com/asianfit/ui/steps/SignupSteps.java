package com.asianfit.ui.steps;

import com.asianfit.ui.pages.SignupPage;
import com.asianfit.ui.utils.DriverFactory;
import com.asianfit.ui.utils.SignupTestState;
import com.asianfit.ui.utils.TestConfig;
import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;
import java.util.UUID;
import org.testng.Assert;

public class SignupSteps {
  private static final String PASSWORD_REQUIREMENTS_MESSAGE =
    "Password must be at least 12 characters and include uppercase, lowercase, a number, and no spaces.";
  private static final String SIGNUP_SUCCESS_MESSAGE =
    "Check your email to verify your account before signing in.";
  private static final String RESEND_VERIFICATION_SUCCESS_MESSAGE = "Verification email sent.";
  private static final String GENERATED_SIGNUP_PASSWORD = "StrongPass123A";

  private SignupPage signupPage() {
    return new SignupPage(DriverFactory.getDriver());
  }

  @When("I sign up with a specified email address and password")
  public void iSignUpWithASpecifiedEmailAddressAndPassword() {
    signUpWithEmailAndPassword(TestConfig.signupUserEmail(), TestConfig.signupUserPassword());
  }

  @When("I sign up with email {string} and password")
  public void iSignUpWithEmailAndPassword(String email) {
    // This inbox must be accessible through the Gmail API credentials used by the test.
    signUpWithEmailAndPassword(email, TestConfig.signupUserPassword());
  }

  @When("I sign up with a generated account email and password")
  public void iSignUpWithAGeneratedAccountEmailAndPassword() {
    signUpWithEmailAndPassword(generatedGmailAlias(TestConfig.signupUserEmail()), TestConfig.signupUserPassword());
  }

  @When("I sign up with a plus email based on {string} and password")
  public void iSignUpWithAPlusEmailBasedOnAndPassword(String email) {
    signUpWithEmailAndPassword(generatedGmailAlias(email), TestConfig.signupUserPassword());
  }

  @When("I sign up with a plus email based on {string} and password {string}")
  public void iSignUpWithAPlusEmailBasedOnAndPassword(String email, String password) {
    signUpWithEmailAndPassword(generatedGmailAlias(email), password);
  }

  @When("I sign up with the same generated plus email and password")
  public void iSignUpWithTheSameGeneratedPlusEmailAndPassword() {
    String password = SignupTestState.signupPassword() != null
      ? SignupTestState.signupPassword()
      : TestConfig.signupUserPassword();
    signUpWithExistingScenarioEmail(password);
  }

  @When("I sign up with the same generated plus email and password {string}")
  public void iSignUpWithTheSameGeneratedPlusEmailAndPassword(String password) {
    signUpWithExistingScenarioEmail(password);
  }

  @When("I sign up with a generated account")
  public void iSignUpWithAGeneratedAccount() {
    signUpWithEmailAndPassword(TestConfig.signupUserEmail(), GENERATED_SIGNUP_PASSWORD);
  }

  @When("I sign up with a generated account using password {string}")
  public void iSignUpWithAGeneratedAccountUsingPassword(String password) {
    String email = "ui-test-invalid-" + UUID.randomUUID().toString().replace("-", "") + "@example.com";
    SignupTestState.rememberSignupEmail(email);
    SignupTestState.rememberSignupPassword(password);
    signupPage().signUp("UI", "Tester", email, password);
  }

  @When("I request a new verification email")
  public void iRequestANewVerificationEmail() {
    signupPage().requestNewVerificationEmail();
    Assert.assertTrue(
      signupPage().hasSuccessMessage(RESEND_VERIFICATION_SUCCESS_MESSAGE),
      "Signup page should confirm a new verification email was sent, but got: " + signupPage().submissionState()
    );
  }

  @Then("the signup page should not show a validation error")
  public void theSignupPageShouldNotShowAValidationError() {
    Assert.assertFalse(signupPage().hasErrorMessage(), "Signup page should not show a validation error");
  }

  @Then("the signup page should show a validation error")
  public void theSignupPageShouldShowAValidationError() {
    Assert.assertTrue(signupPage().hasErrorMessage(), "Signup page should show a validation error");
  }

  @Then("the signup page should show the password requirements error")
  public void theSignupPageShouldShowThePasswordRequirementsError() {
    Assert.assertEquals(signupPage().errorMessage(), PASSWORD_REQUIREMENTS_MESSAGE);
  }

  @Then("the signup page should show a verification success message")
  public void theSignupPageShouldShowAVerificationSuccessMessage() {
    Assert.assertTrue(
      signupPage().hasSuccessMessage(),
      "Signup page should show a verification success message, but got: " + signupPage().submissionState()
    );
    Assert.assertEquals(signupPage().successMessage(), SIGNUP_SUCCESS_MESSAGE);
  }

  @Then("the signup should be successful and ask the user to verify their email address")
  public void theSignupShouldBeSuccessfulAndAskTheUserToVerifyTheirEmailAddress() {
    theSignupPageShouldShowAVerificationSuccessMessage();
  }

  private void signUpWithEmailAndPassword(String email, String password) {
    SignupTestState.rememberSignupEmail(email);
    SignupTestState.rememberSignupPassword(password);
    signupPage().signUp("UI", "Tester", email, password);
  }

  private void signUpWithExistingScenarioEmail(String password) {
    String email = SignupTestState.signupEmail();
    Assert.assertNotNull(email, "Generated plus email should have been created first");
    SignupTestState.rememberSignupPassword(password);
    signupPage().signUp("UI", "Tester", email, password);
  }

  private String generatedGmailAlias(String email) {
    int atIndex = email.indexOf('@');
    Assert.assertTrue(atIndex > 0, "Signup email must be a valid email address: " + email);

    String localPart = email.substring(0, atIndex);
    String domain = email.substring(atIndex + 1);
    Assert.assertEquals(
      domain.toLowerCase(),
      "gmail.com",
      "Generated signup email uses Gmail plus-addressing, so TEST_SIGNUP_EMAIL must be a Gmail inbox with API access."
    );

    return localPart + "+ui" + UUID.randomUUID().toString().replace("-", "") + "@gmail.com";
  }
}
