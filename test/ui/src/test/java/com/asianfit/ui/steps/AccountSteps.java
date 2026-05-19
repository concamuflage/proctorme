package com.asianfit.ui.steps;

import com.asianfit.ui.utils.DatabaseCleanup;
import com.asianfit.ui.utils.SignupTestState;
import com.asianfit.ui.utils.TestConfig;
import io.cucumber.java.en.Then;

public class AccountSteps {
  @Then("delete the account through the API")
  public void deleteTheAccountThroughTheApi() {
    deleteTheAccount();
  }

  @Then("delete the account through database query")
  public void deleteTheAccount() {
    String email = SignupTestState.signupEmail() != null
      ? SignupTestState.signupEmail()
      : TestConfig.signupUserEmail();
    DatabaseCleanup.deleteUserByEmail(email);
  }
}
