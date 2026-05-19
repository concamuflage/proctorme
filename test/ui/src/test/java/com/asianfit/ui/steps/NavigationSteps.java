package com.asianfit.ui.steps;

import com.asianfit.ui.pages.LoginPage;
import com.asianfit.ui.pages.SignupPage;
import com.asianfit.ui.utils.DriverFactory;
import com.asianfit.ui.utils.TestConfig;
import io.cucumber.java.en.Given;
import io.cucumber.java.en.Then;
import org.testng.Assert;

public class NavigationSteps {
  private LoginPage loginPage() {
    return new LoginPage(DriverFactory.getDriver());
  }

  private SignupPage signupPage() {
    return new SignupPage(DriverFactory.getDriver());
  }

  @Given("I open the login page")
  public void iOpenTheLoginPage() {
    DriverFactory.getDriver().get(TestConfig.baseUrl() + "/login");
  }

  @Given("I open the signup page")
  public void iOpenTheSignupPage() {
    signupPage().open();
  }

  @Then("I should be on the login page")
  public void iShouldBeOnTheLoginPage() {
    Assert.assertTrue(loginPage().isVisible(), "Expected login page to be visible");
  }

  @Then("I should be on the signup page")
  public void iShouldBeOnTheSignupPage() {
    Assert.assertTrue(signupPage().isVisible(), "Expected signup page to be visible");
  }
}
