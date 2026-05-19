package com.asianfit.ui.steps;

import com.asianfit.ui.pages.LoginPage;
import com.asianfit.ui.pages.ProductsPage;
import com.asianfit.ui.utils.DriverFactory;
import com.asianfit.ui.utils.SignupTestState;
import com.asianfit.ui.utils.TestConfig;
import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;
import org.testng.Assert;

public class LoginSteps {
  private static final String EMAIL_NOT_VERIFIED_MESSAGE =
    "Please verify your email before signing in.";
  private static final String GENERATED_SIGNUP_PASSWORD = "StrongPass123A";

  private LoginPage loginPage() {
    return new LoginPage(DriverFactory.getDriver());
  }

  private ProductsPage productsPage() {
    return new ProductsPage(DriverFactory.getDriver());
  }

  @When("I sign in with the configured test account")
  public void iSignInWithTheConfiguredTestAccount() {
    loginPage().signIn(TestConfig.testUserEmail(), TestConfig.testUserPassword());
  }

  @When("I sign in with the unverified test account")
  public void iSignInWithTheUnverifiedTestAccount() {
    loginPage().signIn(TestConfig.unverifiedTestUserEmail(), TestConfig.unverifiedTestUserPassword());
  }

  @When("I login in with username {string} and password {string}")
  public void iLoginInWithUsernameAndPassword(String username, String password) {
    loginPage().signIn(username, password);
  }

  @When("I login in with the generated plus email and password {string}")
  public void iLoginInWithTheGeneratedPlusEmailAndPassword(String password) {
    String email = SignupTestState.signupEmail();
    Assert.assertNotNull(email, "Generated plus email should have been created first");
    loginPage().signIn(email, password);
  }

  @When("I login in with the generated plus email and {string}")
  public void iLoginInWithTheGeneratedPlusEmailAnd(String password) {
    iLoginInWithTheGeneratedPlusEmailAndPassword(password);
  }

  @When("I login in with the generated plus email and the new password")
  public void iLoginInWithTheGeneratedPlusEmailAndTheNewPassword() {
    String password = SignupTestState.resetPassword();
    Assert.assertNotNull(password, "New password should have been set first");
    iLoginInWithTheGeneratedPlusEmailAndPassword(password);
  }

  @When("I sign in with the generated account")
  public void iSignInWithTheGeneratedAccount() {
    String email = SignupTestState.signupEmail();
    Assert.assertNotNull(email, "Generated signup email should have been created first");
    loginPage().signIn(email, GENERATED_SIGNUP_PASSWORD);
  }

  @When("I log in with the unverified account credentials")
  public void iLogInWithTheUnverifiedAccountCredentials() {
    String email = SignupTestState.signupEmail();
    Assert.assertNotNull(email, "Signup email should have been created first");
    DriverFactory.getDriver().get(TestConfig.baseUrl() + "/login");
    loginPage().signIn(email, signupPassword());
  }

  @Then("the login should fail with an error message about email verification")
  public void theLoginShouldFailWithAnErrorMessageAboutEmailVerification() {
    theLoginPageShouldShowTheEmailVerificationError();
  }

  @Then("the login should fail with an error message about incorrect password")
  public void theLoginShouldFailWithAnErrorMessageAboutIncorrectPassword() {
    Assert.assertTrue(loginPage().hasErrorMessage(), "Login page should show an authentication error");
    Assert.assertEquals(loginPage().errorMessage(), "Invalid credentials");
  }

  @Then("the login page should not show an authentication error")
  public void theLoginPageShouldNotShowAnAuthenticationError() {
    Assert.assertFalse(loginPage().hasErrorMessage(), "Login page should not show an authentication error");
  }

  @Then("the login page should show the email verification error")
  public void theLoginPageShouldShowTheEmailVerificationError() {
    Assert.assertTrue(loginPage().hasErrorMessage(), "Login page should show the email verification error");
    Assert.assertEquals(loginPage().errorMessage(), EMAIL_NOT_VERIFIED_MESSAGE);
  }

  @Then("the user should be able to log in")
  public void theUserShouldBeAbleToLogIn() {
    Assert.assertTrue(productsPage().showsAllFilter(), "Expected logged-in user to land on the products page");
  }

  @Then("the login should be successful and land on the products page")
  public void theLoginShouldBeSuccessfulAndLandOnTheProductsPage() {
    Assert.assertTrue(productsPage().showsAllFilter(), "Expected successful login to land on the products page");
  }

  private String signupPassword() {
    return SignupTestState.signupPassword() != null ? SignupTestState.signupPassword() : TestConfig.signupUserPassword();
  }
}
