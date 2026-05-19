package com.asianfit.ui.runner;

import io.cucumber.testng.AbstractTestNGCucumberTests;
import io.cucumber.testng.CucumberOptions;
import org.testng.annotations.DataProvider;

@CucumberOptions(
  features = "src/test/resources/features",
  glue = {"com.asianfit.ui.steps", "com.asianfit.ui.hooks"},
  plugin = {"pretty", "html:target/cucumber-report.html"},
  tags = "@CartAndDrawerSync"
)
public class CartAndDrawerSyncRunner extends AbstractTestNGCucumberTests {
  @Override
  @DataProvider(parallel = false)
  public Object[][] scenarios() {
    return super.scenarios();
  }
}
