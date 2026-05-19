package com.asianfit.ui.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;

public class StripeCheckoutPage extends BasePage {
  private static final By CARD_NUMBER_INPUT = By.cssSelector(
    "input[name='number'], input[autocomplete='cc-number'], input[placeholder='Card number']"
  );
  private static final By EXPIRATION_INPUT = By.cssSelector(
    "input[name='exp-date'], input[autocomplete='cc-exp'], input[placeholder*='MM'], input[placeholder='MM / YY']"
  );
  private static final By CVC_INPUT = By.cssSelector(
    "input[name='cvc'], input[autocomplete='cc-csc'], input[placeholder='CVC'], input[placeholder='CVV']"
  );
  private static final By CARDHOLDER_NAME_INPUT = By.cssSelector(
    "input[name='cardholderName'], input[autocomplete='cc-name']"
  );
  private static final By EMAIL_INPUT = By.xpath("//input[@id='email']");
  private static final By ZIP_INPUT = By.cssSelector(
    "input[name='postalCode'], input[autocomplete='postal-code'], input[placeholder='ZIP'], input[placeholder='Postal code']"
  );
  private static final By PHONE_INPUT = By.xpath("//input[@id='phoneNumber']");
  private static final By CARD_RADIO = By.xpath("//input[@id='payment-method-accordion-item-title-card']");
  private static final By PAY_BUTTON = By.xpath("//button[@type='submit']");
  private static final By BUSINESS_BACK_LINK = By.xpath("//a[@data-testid='business-link']");
  private static final By DECLINED_CARD_ERROR = By.xpath(
    "//*[contains(translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'card was declined') " +
    "or contains(translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'your card has been declined') " +
    "or contains(translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'declined')]"
  );

  public StripeCheckoutPage(WebDriver driver) {
    super(driver);
  }

  public boolean isVisible() {
    try {
      return wait.until((ignored) -> {
        String url = currentUrl();
        return url.contains("checkout.stripe.com") || url.contains("pay.stripe.com");
      });
    } catch (Exception ignored) {
      return false;
    }
  }

  public void enterCardNumber(String value) {
    typeIntoField(CARD_NUMBER_INPUT, value);
  }

  public void enterExpirationDate(String value) {
    typeIntoField(EXPIRATION_INPUT, value);
  }

  public void enterSecurityCode(String value) {
    typeIntoField(CVC_INPUT, value);
  }

  public void enterCardholderName(String value) {
    typeIntoField(CARDHOLDER_NAME_INPUT, value);
  }

  public void enterEmail(String value) {
    typeIntoField(EMAIL_INPUT, value);
  }

  public void enterZipCode(String value) {
    typeIntoField(ZIP_INPUT, value);
  }

  public void enterPhoneNumber(String value) {
    WebElement field = wait.until(ExpectedConditions.presenceOfElementLocated(PHONE_INPUT));
    // ((JavascriptExecutor) driver).executeScript("arguments[0].scrollIntoView({block:'center'});", field);
    // // ((JavascriptExecutor) driver).executeScript("arguments[0].focus();", field);
    field.sendKeys(value);
  }

  public void chooseCardPaymentOption() {
    driver.switchTo().defaultContent();
    WebElement radio = wait.until(ExpectedConditions.presenceOfElementLocated(CARD_RADIO));
    ((JavascriptExecutor) driver).executeScript("arguments[0].scrollIntoView({block:'center'});", radio);
    ((JavascriptExecutor) driver).executeScript("arguments[0].click();", radio);
  }

  public void submitPayment() {
    driver.switchTo().defaultContent();

    WebElement payButton = wait.until(ExpectedConditions.presenceOfElementLocated(PAY_BUTTON));
    ((JavascriptExecutor) driver).executeScript(
      "const r = arguments[0].getBoundingClientRect();" +
      "window.scrollBy({ top: r.top - (window.innerHeight / 2) + (r.height / 2), behavior: 'instant' });",
      payButton
    );
    payButton.click();
  }

  public void cancelCheckout() {
    driver.switchTo().defaultContent();
    driver.navigate().back();
  }

  public void cancelCheckoutThroughBusinessBackLink() {
    driver.switchTo().defaultContent();
    WebElement backLink = wait.until(ExpectedConditions.elementToBeClickable(BUSINESS_BACK_LINK));
    ((JavascriptExecutor) driver).executeScript("arguments[0].scrollIntoView({block:'center'});", backLink);
    backLink.click();
  }

  public boolean showsDeclinedCardError() {
    try {
      return wait.until(ExpectedConditions.visibilityOfElementLocated(DECLINED_CARD_ERROR)).isDisplayed();
    } catch (Exception ignored) {
      return false;
    }
  }

  private void typeIntoField(By locator, String value) {
    WebElement field = wait.until(ExpectedConditions.elementToBeClickable(locator));
    ((JavascriptExecutor) driver).executeScript("arguments[0].focus();", field);
    field.sendKeys(value);
  }
}
