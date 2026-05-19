package com.asianfit.ui.pages;

import java.time.Duration;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

public abstract class BasePage {
  protected final WebDriver driver;
  protected final WebDriverWait wait;

  protected BasePage(WebDriver driver) {
    this.driver = driver;
    this.wait = new WebDriverWait(driver, Duration.ofSeconds(15));
  }

  protected WebElement waitForVisible(By locator) {
    return wait.until(ExpectedConditions.visibilityOfElementLocated(locator));
  }

  protected WebElement waitForClickable(By locator) {
    return wait.until(ExpectedConditions.elementToBeClickable(locator));
  }

  protected void click(By locator) {
    waitForClickable(locator).click();
  }

  protected void type(By locator, String value) {
    WebElement element = waitForVisible(locator);
    element.clear();
    element.sendKeys(value);
  }

  protected String text(By locator) {
    return waitForVisible(locator).getText().trim();
  }

protected int count(By locator) {
    return wait.until(driver -> driver.findElements(locator).size());
  }

  protected String currentUrl() {
    return driver.getCurrentUrl();
  }

  protected boolean waitForUrlContains(String fragment) {
    try {
      return wait.until(ExpectedConditions.urlContains(fragment));
    } catch (Exception ignored) {
      return false;
    }
  }
}
