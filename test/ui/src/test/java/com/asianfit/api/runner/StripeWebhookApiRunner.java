package com.asianfit.api.runner;

import io.cucumber.testng.AbstractTestNGCucumberTests;
import io.cucumber.testng.CucumberOptions;
import org.testng.annotations.DataProvider;

@CucumberOptions(
  features = "src/test/resources/features",
  glue = {"com.asianfit.api.steps", "com.asianfit.api.hooks"},
  plugin = {"pretty", "html:target/stripe-webhook-api-cucumber-report.html"},
  tags = "@StripeWebhookApi"
)
public class StripeWebhookApiRunner extends AbstractTestNGCucumberTests {
  @Override
  @DataProvider(parallel = false)
  public Object[][] scenarios() {
    return super.scenarios();
  }
}
