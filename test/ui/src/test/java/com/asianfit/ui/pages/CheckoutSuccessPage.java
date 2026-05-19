package com.asianfit.ui.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;

public class CheckoutSuccessPage extends BasePage {
  private static final By TITLE = By.xpath("//h1[normalize-space()='Thank you for your order.']");
  private static final By CONFIRMING_BANNER = By.xpath("//*[normalize-space()='Confirming payment']");
  private static final By INVOICE_LINK = By.xpath("//a[normalize-space()='Download invoice PDF']");

  public CheckoutSuccessPage(WebDriver driver) {
    super(driver);
  }

  public boolean isVisible() {
    return waitForUrlContains("/checkout/success") && count(TITLE) > 0;
  }

  public void waitForSuccessPage() {
    waitForUrlContains("/checkout/success");
    waitForVisible(TITLE);
  }

  public void refresh() {
    driver.navigate().refresh();
    waitForSuccessPage();
  }

  public void waitForInvoiceLink() {
    waitForVisible(INVOICE_LINK);
  }

  public String invoiceLinkHref() {
    return waitForVisible(INVOICE_LINK).getAttribute("href");
  }

  public void waitForConfirmationStateToDisappear() {
    wait.until((ignored) -> count(CONFIRMING_BANNER) == 0);
  }
}
