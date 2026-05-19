package com.asianfit.ui.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.openqa.selenium.support.ui.Select;
import org.openqa.selenium.support.ui.ExpectedConditions;

public class CartPage extends BasePage {
  private static final By PAGE_TITLE = By.xpath("//h1[normalize-space()='Your cart']");
  private static final By CART_ITEMS = By.cssSelector("[data-testid^='cart-line-item-']");
  private static final By SUBTOTAL = By.xpath("//*[@data-testid='cart-summary-subtotal']");
  private static final By SHIPPING = By.xpath("//*[@data-testid='cart-summary-shipping']");
  private static final By ORDER_TOTAL = By.xpath("//*[@data-testid='cart-summary-order-total']");
  private static final By SHIPPING_WEIGHT = By.xpath("//*[@data-testid='cart-summary-shipping-weight']");
  private static final By WEIGHT_DETAILS_TOGGLE = By.xpath("//*[@data-testid='cart-summary-weight-toggle']");
  private static final By CLOTHES_WEIGHT = By.xpath("//*[@data-testid='cart-summary-clothes-weight']");
  private static final By BOX_WEIGHT = By.xpath("//*[@data-testid='cart-summary-box-weight']");
  private static final By SHIPPING_INPUTS = By.cssSelector("[data-testid^='cart-shipping-option-input-']");
  private static final By CHECKOUT_BUTTON = By.xpath("//button[normalize-space()='Checkout' or normalize-space()='Hide checkout details']");
  private static final By CHECKOUT_DETAILS_TITLE = By.xpath("//h3[normalize-space()='Essential order details']");
  private static final By PAY_WITH_CARD_BUTTON = By.xpath("//button[normalize-space()='Pay with card' or normalize-space()='Redirecting...']");
  private static final By SHIPPING_FULL_NAME_INPUT = By.xpath("//label[contains(normalize-space(.), 'Full name')]//input");
  private static final By SHIPPING_PHONE_INPUT = By.xpath("//label[contains(normalize-space(.), 'Phone')]//input");
  private static final By SHIPPING_STREET_INPUT = By.xpath("//label[contains(normalize-space(.), 'Street')]//input");
  private static final By SHIPPING_CITY_INPUT = By.xpath("//label[contains(normalize-space(.), 'City')]//input");
  private static final By SHIPPING_STATE_SELECT = By.xpath("//label[contains(normalize-space(.), 'State')]//select");
  private static final By SHIPPING_ZIP_CODE_INPUT = By.xpath("//label[contains(normalize-space(.), 'ZIP code')]//input");
  private static final By SAVE_SHIPPING_ADDRESS_BUTTON = By.xpath("//button[normalize-space()='Save shipping address' or normalize-space()='Saving...']");

  public CartPage(WebDriver driver) {
    super(driver);
  }

  public boolean isVisible() {
    return waitForVisible(PAGE_TITLE).isDisplayed() && currentUrl().contains("/cart");
  }

  public boolean isVisibleWithCheckoutDetails() {
    return isVisible() && hasCheckoutDetails();
  }

  public boolean isAtCartUrl() {
    return wait.until(ExpectedConditions.urlMatches(".*/cart\\?checkout=1$"));
  }

  public void open() {
    driver.get(com.asianfit.ui.utils.TestConfig.baseUrl() + "/cart");
  }

  public void clickCheckout() {
    click(CHECKOUT_BUTTON);
  }

  public void waitForCheckoutDetails() {
    waitForVisible(CHECKOUT_DETAILS_TITLE);
  }

  public void clickButton(String label) {
    click(By.xpath("//button[normalize-space()='" + label + "']"));
  }

  public void enterShippingFullName(String fullName) {
    type(SHIPPING_FULL_NAME_INPUT, fullName);
  }

  public void enterShippingPhone(String phone) {
    type(SHIPPING_PHONE_INPUT, phone);
  }

  public void enterShippingStreet(String street) {
    type(SHIPPING_STREET_INPUT, street);
  }

  public void enterShippingCity(String city) {
    type(SHIPPING_CITY_INPUT, city);
  }

  public void selectShippingState(String state) {
    new Select(waitForVisible(SHIPPING_STATE_SELECT)).selectByValue(state);
  }

  public void enterShippingZipCode(String zipCode) {
    type(SHIPPING_ZIP_CODE_INPUT, zipCode);
  }

  public void saveShippingAddress() {
    click(SAVE_SHIPPING_ADDRESS_BUTTON);
    waitForClickable(PAY_WITH_CARD_BUTTON);
  }

  public boolean hasCheckoutDetails() {
    try {
      return waitForVisible(CHECKOUT_DETAILS_TITLE).isDisplayed();
    } catch (Exception ignored) {
      return false;
    }
  }

  public void startStripeCheckoutPayment() {
    waitForVisible(PAY_WITH_CARD_BUTTON);
    click(PAY_WITH_CARD_BUTTON);
  }

  public double clothesWeightKg() {
    openWeightDetails();
    String raw = text(CLOTHES_WEIGHT).replace("kg", "").trim();
    return Double.parseDouble(raw);
  }

  public double boxWeightKg() {
    openWeightDetails();
    String raw = text(BOX_WEIGHT).replace("kg", "").trim();
    return Double.parseDouble(raw);
  }

  public double shipmentWeightKg() {
    String raw = text(SHIPPING_WEIGHT).replace("kg", "").trim();
    return Double.parseDouble(raw);
  }

  public double subtotalUsd() {
    String raw = text(SUBTOTAL).replace("$", "").replace(",", "").trim();
    return Double.parseDouble(raw);
  }

  public double shippingUsd() {
    String raw = text(SHIPPING).replace("$", "").replace(",", "").trim();
    return Double.parseDouble(raw);
  }

  public double orderTotalUsd() {
    String raw = text(ORDER_TOTAL).replace("$", "").replace(",", "").trim();
    return Double.parseDouble(raw);
  }

  public ShippingRates selectedShippingRatesUsd() {
    // Each shipping option renders a radio input with a stable test id.
    // Find the currently selected option first, then derive the matching
    // rate test ids from that option's id suffix.
    List<WebElement> inputs = driver.findElements(SHIPPING_INPUTS);
    for (WebElement input : inputs) {
      if (!input.isSelected()) {
        continue;
      }

      String optionId = input.getDomAttribute("data-testid").replace("cart-shipping-option-input-", "");
      // The rate spans are test-only hooks and may be hidden, so they are
      // read by their stable test ids rather than by visible label text.
      double firstRateUsd = amountFromTestId("cart-shipping-option-first-rate-" + optionId);
      double additionalRateUsd = amountFromTestId("cart-shipping-option-additional-rate-" + optionId);
      return new ShippingRates(firstRateUsd, additionalRateUsd);
    }

    throw new IllegalStateException("Could not determine selected shipping rates");
  }

  public void selectSecondShippingOption() {
    List<WebElement> inputs = driver.findElements(SHIPPING_INPUTS);
    if (inputs.size() < 2) {
      throw new IllegalStateException("Expected at least 2 shipping options");
    }
    WebElement secondInput = inputs.get(1);
    if (!secondInput.isSelected()) {
      secondInput.click();
    }
  }

  public boolean isSecondShippingOptionSelected() {
    List<WebElement> inputs = driver.findElements(SHIPPING_INPUTS);
    if (inputs.size() < 2) {
      throw new IllegalStateException("Expected at least 2 shipping options");
    }
    return inputs.get(1).isSelected();
  }

  public void increaseFirstItemQuantity() {
    click(By.cssSelector("[data-testid^='cart-item-increase-']"));
  }

  public void increaseSecondItemQuantity() {
    List<WebElement> items = driver.findElements(CART_ITEMS);
    if (items.size() < 2) {
      throw new IllegalStateException("Expected at least 2 cart items on the cart page");
    }
    WebElement secondItem = items.get(1);
    WebElement increaseButton = secondItem.findElement(By.cssSelector("[data-testid^='cart-item-increase-']"));
    increaseButton.click();
  }

  public Map<String, Integer> itemQuantitiesById() {
    waitForVisible(PAGE_TITLE);
    Map<String, Integer> quantities = new LinkedHashMap<>();
    for (WebElement item : driver.findElements(CART_ITEMS)) {
      String itemId = item.getDomAttribute("data-testid").replace("cart-line-item-", "");
      WebElement quantity = item.findElement(By.cssSelector("[data-testid='cart-item-qty-" + itemId + "']"));
      quantities.put(itemId, Integer.parseInt(quantity.getText().trim()));
    }
    return quantities;
  }

  private void openWeightDetails() {
    if (count(CLOTHES_WEIGHT) == 0) {
      click(WEIGHT_DETAILS_TOGGLE);
    }
  }

  private double amountFromTestId(String testId) {
    WebElement element = wait.until(
      ExpectedConditions.presenceOfElementLocated(By.xpath("//*[@data-testid='" + testId + "']"))
    );
    Object textContent = ((JavascriptExecutor) driver).executeScript(
      "return arguments[0].textContent || '';",
      element
    );
    String raw = String.valueOf(textContent).replace("$", "").replace(",", "").trim();
    return Double.parseDouble(raw);
  }

  public record ShippingRates(double firstKgUsd, double additionalKgUsd) {}
}
