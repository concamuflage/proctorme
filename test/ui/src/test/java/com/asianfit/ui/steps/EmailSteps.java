package com.asianfit.ui.steps;

import com.asianfit.ui.utils.DriverFactory;
import com.asianfit.ui.utils.GmailVerificationClient;
import com.asianfit.ui.utils.SignupTestState;
import com.asianfit.ui.utils.TestConfig;
import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;
import java.net.URI;
import java.time.Duration;
import org.openqa.selenium.By;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;
import org.testng.Assert;

public class EmailSteps {
  @Then("I log into its email account through the API and find the verification email")
  public void iLogIntoItsEmailAccountThroughTheApiAndFindTheVerificationEmail() {
    String email = SignupTestState.signupEmail();
    Assert.assertNotNull(email, "Signup email should have been created first");
    GmailVerificationClient.VerificationEmail verificationEmail =
      GmailVerificationClient.findLatestVerificationEmail(email);
    SignupTestState.rememberVerificationEmail(
      verificationEmail.verificationLink(),
      verificationEmail.from()
    );
    Assert.assertTrue(
      verificationEmail.verificationLink().contains("/verify-email?"),
      "Expected a verification link, got: " + verificationEmail.verificationLink()
    );
  }

  @Then("the verification email sender should be correct")
  public void theVerificationEmailSenderShouldBeCorrect() {
    String sender = SignupTestState.verificationEmailSender();
    Assert.assertNotNull(sender, "Verification email sender should have been captured first");
    Assert.assertTrue(
      sender.toLowerCase().contains(TestConfig.resendFromEmail().toLowerCase()),
      "Expected verification email sender to contain " + TestConfig.resendFromEmail() + ", got: " + sender
    );
  }

  @Then("I click the link in the verification email")
  public void iClickTheLinkInTheVerificationEmail() {
    String link = SignupTestState.verificationLink();
    Assert.assertNotNull(link, "Verification link should have been found first");
    DriverFactory.getDriver().get(linkForCurrentBaseUrl(link));
  }

  @Then("the email verification should be successful")
  public void theEmailVerificationShouldBeSuccessful() {
    WebDriverWait wait = new WebDriverWait(DriverFactory.getDriver(), Duration.ofSeconds(15));
    wait.until(ExpectedConditions.textToBePresentInElementLocated(By.tagName("body"), "Email verified"));
  }

  @Then("I should see message {string}")
  public void iShouldSeeMessage(String message) {
    WebDriverWait wait = new WebDriverWait(DriverFactory.getDriver(), Duration.ofSeconds(15));
    wait.until(ExpectedConditions.textToBePresentInElementLocated(By.tagName("body"), message));
  }

  @When("I wait 10 seconds before signing in")
  public void iWaitTenSecondsBeforeSigningIn() throws InterruptedException {
    Thread.sleep(10_000);
  }

  @When("Wait 10 Seconds before login and look for verification email")
  public void waitTenSecondsBeforeLoginAndLookForVerificationEmail() throws InterruptedException {
    iWaitTenSecondsBeforeSigningIn();
  }

  private String linkForCurrentBaseUrl(String link) {
    URI original = URI.create(link);
    URI base = URI.create(TestConfig.baseUrl());
    return base.resolve(original.getRawPath() + "?" + original.getRawQuery()).toString();
  }
}
