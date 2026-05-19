package com.asianfit.ui.pages;

import com.asianfit.ui.utils.TestConfig;
import java.time.Duration;
import org.openqa.selenium.By;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.WebDriverWait;

public class SignupPage extends BasePage {
  private static final By FIRST_NAME = By.id("signup-first-name");
  private static final By LAST_NAME = By.id("signup-last-name");
  private static final By EMAIL = By.id("signup-email");
  private static final By PASSWORD = By.id("signup-password");
  private static final By CONFIRM_PASSWORD = By.id("signup-confirm-password");
  private static final By SUBMIT = By.id("signup-submit");
  private static final By ERROR = By.id("signup-error");
  private static final By SUCCESS = By.id("signup-success");
  private static final By RESEND_VERIFICATION = By.xpath("//button[normalize-space()='Resend verification email']");

  public SignupPage(WebDriver driver) {
    super(driver);
  }

  public void open() {
    driver.get(TestConfig.baseUrl() + "/signup");
  }

  public boolean isVisible() {
    if (!waitForUrlContains("/signup")) {
      return false;
    }
    return count(EMAIL) > 0;
  }

  public void signUp(String firstName, String lastName, String email, String password) {
    signUp(firstName, lastName, email, password, password);
  }

  public void signUp(String firstName, String lastName, String email, String password, String confirmPassword) {
    typeIntoField(FIRST_NAME, firstName);
    typeIntoField(LAST_NAME, lastName);
    typeIntoField(EMAIL, email);
    typeIntoField(PASSWORD, password);
    typeIntoField(CONFIRM_PASSWORD, confirmPassword);
    submitForm();
  }

  public boolean hasErrorMessage() {
    return waitForSubmissionResult(ERROR);
  }

  public String errorMessage() {
    return text(ERROR);
  }

  public boolean hasSuccessMessage() {
    return waitForSubmissionResult(SUCCESS);
  }

  public String successMessage() {
    return text(SUCCESS);
  }

  public void requestNewVerificationEmail() {
    WebElement resendButton = waitForClickable(RESEND_VERIFICATION);
    resendButton.click();
  }

  public boolean hasSuccessMessage(String message) {
    try {
      return new WebDriverWait(driver, Duration.ofSeconds(10))
        .until(ExpectedConditions.textToBePresentInElementLocated(SUCCESS, message));
    } catch (Exception ignored) {
      return false;
    }
  }

  public String submissionState() {
    if (count(SUCCESS) > 0) {
      return "success: " + successMessage();
    }
    if (count(ERROR) > 0) {
      return "error: " + errorMessage();
    }

    String emailValidationMessage = validationMessage(EMAIL);
    if (!emailValidationMessage.isBlank()) {
      return "email validation: " + emailValidationMessage;
    }

    String passwordValidationMessage = validationMessage(PASSWORD);
    if (!passwordValidationMessage.isBlank()) {
      return "password validation: " + passwordValidationMessage;
    }

    String confirmPasswordValidationMessage = validationMessage(CONFIRM_PASSWORD);
    if (!confirmPasswordValidationMessage.isBlank()) {
      return "confirm password validation: " + confirmPasswordValidationMessage;
    }

    return "no success or error message rendered"
      + ", url=" + currentUrl()
      + ", submitDisabled=" + isSubmitDisabled()
      + ", submitLabel=" + submitLabel();
  }

  private void typeIntoField(By locator, String value) {
    WebElement field = waitForPresence(locator);
    field.clear();
    field.sendKeys(value);
  }

  private WebElement waitForPresence(By locator) {
    return wait.until(org.openqa.selenium.support.ui.ExpectedConditions.presenceOfElementLocated(locator));
  }

  private void submitForm() {
    WebElement submitButton = waitForClickable(SUBMIT);
    ((JavascriptExecutor) driver).executeScript("arguments[0].scrollIntoView({block: 'center'});", submitButton);
    submitButton.click();
  }

  private boolean waitForSubmissionResult(By locator) {
    try {
      return new WebDriverWait(driver, Duration.ofSeconds(10))
        .until(currentDriver -> !currentDriver.findElements(locator).isEmpty());
    } catch (Exception ignored) {
      return false;
    }
  }

  private String validationMessage(By locator) {
    try {
      WebElement element = waitForVisible(locator);
      Object result = ((JavascriptExecutor) driver).executeScript(
        "return arguments[0].validationMessage || '';",
        element
      );
      return result == null ? "" : result.toString().trim();
    } catch (Exception ignored) {
      return "";
    }
  }

  private boolean isSubmitDisabled() {
    try {
      return waitForVisible(SUBMIT).getDomProperty("disabled") != null;
    } catch (Exception ignored) {
      return false;
    }
  }

  private String submitLabel() {
    try {
      return waitForVisible(SUBMIT).getText().trim();
    } catch (Exception ignored) {
      return "";
    }
  }
}
