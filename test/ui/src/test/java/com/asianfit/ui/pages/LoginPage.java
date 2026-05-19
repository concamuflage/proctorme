package com.asianfit.ui.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;

public class LoginPage extends BasePage {
  private static final By EMAIL = By.id("login-email");
  private static final By PASSWORD = By.id("login-password");
  private static final By SUBMIT = By.id("login-submit");
  private static final By ERROR = By.id("login-error");
  private static final By FORGOT_PASSWORD = By.linkText("Forgot password?");

  public LoginPage(WebDriver driver) {
    super(driver);
  }

  public boolean isVisible() {
    if (!waitForUrlContains("/login")) {
      return false;
    }
    return count(EMAIL) > 0;
  }

  public void signIn(String email, String password) {
    waitForUrlContains("/login");
    wait.until(ExpectedConditions.presenceOfElementLocated(EMAIL));
    typeIntoField(EMAIL, email);
    typeIntoField(PASSWORD, password);
    click(SUBMIT);
  }

  public boolean hasErrorMessage() {
    return count(ERROR) > 0;
  }

  public String errorMessage() {
    return text(ERROR);
  }

  public void openForgotPassword() {
    click(FORGOT_PASSWORD);
  }

  private void typeIntoField(By locator, String value) {
    WebElement field = waitForClickable(locator);
    field.click();
    field.clear();
    field.sendKeys(value);
  }
}
