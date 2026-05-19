package com.asianfit.ui.listeners;

import java.util.concurrent.atomic.AtomicBoolean;
import org.testng.IInvokedMethod;
import org.testng.IInvokedMethodListener;
import org.testng.ISuite;
import org.testng.ISuiteListener;
import org.testng.ITestListener;
import org.testng.ITestResult;
import org.testng.SkipException;

public class FailFastListener implements IInvokedMethodListener, ITestListener, ISuiteListener {
  // Shared flag for the whole suite so later test invocations can be skipped
  // after the first real failure is observed.
  private static final AtomicBoolean FAILURE_DETECTED = new AtomicBoolean(false);

  @Override
  public void onStart(ISuite suite) {
    // Reset fail-fast state at the beginning of each suite run.
    FAILURE_DETECTED.set(false);
  }

  @Override
  public void beforeInvocation(IInvokedMethod method, ITestResult testResult) {
    if (!method.isTestMethod()) {
      return;
    }

    // Stop executing further test methods once one test has already failed.
    if (FAILURE_DETECTED.get()) {
      throw new SkipException("Skipping because a previous test already failed.");
    }
  }

  @Override
  public void onTestFailure(ITestResult result) {
    // Any hard failure should trigger fail-fast for the remaining tests.
    FAILURE_DETECTED.set(true);
  }

  @Override
  public void onTestFailedButWithinSuccessPercentage(ITestResult result) {
    // Treat partial-success failures as real failures for suite fail-fast behavior.
    FAILURE_DETECTED.set(true);
  }

  @Override
  public void onTestFailedWithTimeout(ITestResult result) {
    // Timeouts should also stop later tests because the suite is no longer healthy.
    FAILURE_DETECTED.set(true);
  }
}
