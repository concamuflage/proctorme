package com.asianfit.ui.pages;

import com.asianfit.ui.utils.TestConfig;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;

public class HomePage extends BasePage {
  private static final By SIGN_IN_BUTTON = By.xpath("//button[normalize-space()='Sign in']");
  private static final By SIGN_UP_BUTTON = By.xpath("//button[normalize-space()='Sign up']");
  private static final By MODAL_CLOSE_BUTTON = By.cssSelector("[aria-label='Close']");
  private static final By LOGIN_MODAL_HEADING = By.xpath("//h1[normalize-space()='Welcome back']");
  private static final By SIGNUP_MODAL_HEADING = By.xpath("//h1[normalize-space()='Create your account']");
  private static final By SWITCH_TO_SIGNUP_BUTTON = By.xpath("//button[normalize-space()='Create an account']");

  public HomePage(WebDriver driver) {
    super(driver);
  }

  public void open() {
    driver.get(TestConfig.baseUrl() + "/");
    waitForVisible(SIGN_IN_BUTTON);
  }

  public void openLoginModal() {
    click(SIGN_IN_BUTTON);
  }

  public void openSignupModal() {
    click(SIGN_UP_BUTTON);
  }

  public void switchLoginModalToSignupModal() {
    click(SWITCH_TO_SIGNUP_BUTTON);
  }

  public void closeModal() {
    click(MODAL_CLOSE_BUTTON);
  }

  public boolean isLoginModalVisible() {
    return count(LOGIN_MODAL_HEADING) > 0;
  }

  public boolean isSignupModalVisible() {
    return count(SIGNUP_MODAL_HEADING) > 0;
  }

  public boolean isModalClosed() {
    return count(MODAL_CLOSE_BUTTON) == 0;
  }
}
