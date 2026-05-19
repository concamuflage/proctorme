package com.asianfit.ui.hooks;

import com.asianfit.ui.utils.DriverFactory;
import com.asianfit.ui.utils.DatabaseCleanup;
import com.asianfit.ui.utils.SignupTestState;
import io.cucumber.java.After;
import io.cucumber.java.AfterStep;
import io.cucumber.java.Before;

public class Hooks {
  private static final long STEP_PAUSE_MS = 1200;

  // Runs before each scenario starts.
  @Before
  public void setUp() {
    // Each scenario gets its own browser session to avoid cross-test state bleed.
    DriverFactory.createDriver();
  }

  @Before("@Cart or @CartAndDrawerSync")
  public void cleanCartBeforeScenario() {
    DatabaseCleanup.deleteTestUserCart();
  }

  // Runs after every individual step in a scenario.
  @AfterStep
  public void pauseAfterEachStep() {
    try {
      // Slow the UI flow down so step-by-step execution is visible during runs.
      Thread.sleep(STEP_PAUSE_MS);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw new IllegalStateException("Interrupted while pausing after step", e);
    }
  }

  // Runs after each scenario finishes, whether it passed or failed.
  @After
  public void tearDown() {
    // Always close the driver so parallel scenarios do not leak browser processes.
    DriverFactory.quitDriver();
  }

  @After("@Signup or @ResetPassword")
  public void cleanSignupUserAfterScenario() {
    String signupEmail = SignupTestState.signupEmail();
    try {
      if (signupEmail != null && !signupEmail.isBlank()) {
        DatabaseCleanup.deleteUserByEmail(signupEmail);
      }
    } finally {
      SignupTestState.clear();
    }
  }

  @After("@Payment")
  public void cleanPaymentUserAfterScenario() {
    String signupEmail = SignupTestState.signupEmail();
    try {
      if (signupEmail != null && !signupEmail.isBlank()) {
        DatabaseCleanup.deletePaymentUserDataByEmail(signupEmail);
      }
    } finally {
      SignupTestState.clear();
    }
  }

  @After("@Cart or @CartAndDrawerSync")
  public void cleanCartAfterScenario() {
    DatabaseCleanup.deleteTestUserCart();
  }
}
