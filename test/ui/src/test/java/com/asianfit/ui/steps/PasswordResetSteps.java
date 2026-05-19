package com.asianfit.ui.steps;

import com.asianfit.ui.pages.ForgotPasswordPage;
import com.asianfit.ui.pages.LoginPage;
import com.asianfit.ui.pages.ResetPasswordPage;
import com.asianfit.ui.utils.DriverFactory;
import com.asianfit.ui.utils.GmailVerificationClient;
import com.asianfit.ui.utils.SignupTestState;
import com.asianfit.ui.utils.TestConfig;
import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;
import java.net.URI;
import org.testng.Assert;

public class PasswordResetSteps {
  private LoginPage loginPage() {
    return new LoginPage(DriverFactory.getDriver());
  }

  private ForgotPasswordPage forgotPasswordPage() {
    return new ForgotPasswordPage(DriverFactory.getDriver());
  }

  private ResetPasswordPage resetPasswordPage() {
    return new ResetPasswordPage(DriverFactory.getDriver());
  }

  @When("I click on the {string} link")
  public void iClickOnTheLink(String linkText) {
    if ("Forgot Password".equalsIgnoreCase(linkText) || "Forgot password".equalsIgnoreCase(linkText)) {
      loginPage().openForgotPassword();
      Assert.assertTrue(forgotPasswordPage().isVisible(), "Expected forgot password page to be visible");
      return;
    }

    throw new IllegalArgumentException("Unsupported link: " + linkText);
  }

  @When("I enter my email address")
  public void iEnterMyEmailAddress() {
    String email = SignupTestState.signupEmail();
    Assert.assertNotNull(email, "Signup email should have been created first");
    forgotPasswordPage().enterEmail(email);
  }

  @When("submit the form")
  public void submitTheForm() {
    forgotPasswordPage().submit();
  }

  @Then("I should see a confirmation message that a password reset email has been sent")
  public void iShouldSeeAConfirmationMessageThatAPasswordResetEmailHasBeenSent() {
    Assert.assertTrue(
      forgotPasswordPage().hasNotice("password reset email has been sent"),
      "Expected password reset confirmation message"
    );
  }

  @Then("I should receive a password reset email with instructions to reset my password")
  public void iShouldReceiveAPasswordResetEmailWithInstructionsToResetMyPassword() {
    String email = SignupTestState.signupEmail();
    Assert.assertNotNull(email, "Signup email should have been created first");
    String link = GmailVerificationClient.findLatestPasswordResetLink(email);
    SignupTestState.rememberPasswordResetLink(link);
    Assert.assertTrue(link.contains("/reset-password?"), "Expected a password reset link, got: " + link);
  }

  @Then("I click the link in the password reset email")
  public void iClickTheLinkInThePasswordResetEmail() {
    String link = SignupTestState.passwordResetLink();
    Assert.assertNotNull(link, "Password reset link should have been found first");
    DriverFactory.getDriver().get(linkForCurrentBaseUrl(link));
  }

  @Then("I should be taken to the password reset page")
  public void iShouldBeTakenToThePasswordResetPage() {
    Assert.assertTrue(resetPasswordPage().isVisible(), "Expected password reset page to be visible");
  }

  @Then("I enter a new password {string} that meets the password policy")
  public void iEnterANewPasswordThatMeetsThePasswordPolicy(String password) {
    SignupTestState.rememberResetPassword(password);
    resetPasswordPage().enterPassword(password);
  }

  @Then("I enter a new password {string} again to confirm")
  public void iEnterANewPasswordAgainToConfirm(String password) {
    resetPasswordPage().enterConfirmPassword(password);
  }

  @Then("I submit the new password")
  public void iSubmitTheNewPassword() {
    resetPasswordPage().submit();
  }

  private String linkForCurrentBaseUrl(String link) {
    URI original = URI.create(link);
    URI base = URI.create(TestConfig.baseUrl());
    return base.resolve(original.getRawPath() + "?" + original.getRawQuery()).toString();
  }
}
