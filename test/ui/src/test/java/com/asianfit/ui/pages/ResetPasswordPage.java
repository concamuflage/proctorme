package com.asianfit.ui.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;

public class ResetPasswordPage extends BasePage {
  private static final By PASSWORD = By.id("reset-password");
  private static final By CONFIRM_PASSWORD = By.id("reset-password-confirm");
  private static final By SUBMIT = By.xpath("//button[normalize-space()='Reset password']");

  public ResetPasswordPage(WebDriver driver) {
    super(driver);
  }

  public boolean isVisible() {
    if (!waitForUrlContains("/reset-password")) {
      return false;
    }
    return count(PASSWORD) > 0;
  }

  public void enterPassword(String password) {
    typeIntoField(PASSWORD, password);
  }

  public void enterConfirmPassword(String password) {
    typeIntoField(CONFIRM_PASSWORD, password);
  }

  public void submit() {
    click(SUBMIT);
  }

  private void typeIntoField(By locator, String value) {
    WebElement field = waitForVisible(locator);
    field.clear();
    field.sendKeys(value);
  }
}
