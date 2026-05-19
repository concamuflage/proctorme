package com.asianfit.ui.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;

public class ForgotPasswordPage extends BasePage {
  private static final By EMAIL = By.id("forgot-password-email");
  private static final By SUBMIT = By.xpath("//button[normalize-space()='Send reset link']");

  public ForgotPasswordPage(WebDriver driver) {
    super(driver);
  }

  public boolean isVisible() {
    if (!waitForUrlContains("/forgot-password")) {
      return false;
    }
    return count(EMAIL) > 0;
  }

  public void requestReset(String email) {
    enterEmail(email);
    submit();
  }

  public void enterEmail(String email) {
    WebElement field = waitForVisible(EMAIL);
    field.clear();
    field.sendKeys(email);
  }

  public void submit() {
    click(SUBMIT);
  }

  public boolean hasNotice(String message) {
    try {
      return waitForVisible(By.xpath("//*[contains(normalize-space(), '" + message + "')]")).isDisplayed();
    } catch (Exception ignored) {
      return false;
    }
  }
}
