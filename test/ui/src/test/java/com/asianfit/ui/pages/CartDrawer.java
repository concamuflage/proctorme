package com.asianfit.ui.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class CartDrawer extends BasePage {
  private static final By DRAWER = By.cssSelector("[data-testid='cart-drawer']");
  private static final By CART_BUTTON = By.cssSelector("[data-testid='cart-button']");
  private static final By CART_ITEMS = By.cssSelector("[data-testid^='cart-drawer-line-item-']");
  private static final By FIRST_ITEM_INCREASE = By.cssSelector("[data-testid^='cart-drawer-item-increase-']");
  private static final By FIRST_ITEM_QTY = By.cssSelector("[data-testid^='cart-drawer-item-qty-']");
  private static final By FIRST_ITEM_REMOVE = By.cssSelector("[data-testid^='cart-drawer-item-remove-']");
  private static final By SUBTOTAL = By.cssSelector("[data-testid='cart-drawer-subtotal']");
  private static final By SHIPPING = By.cssSelector("[data-testid='cart-drawer-summary-shipping']");
  private static final By ORDER_TOTAL = By.cssSelector("[data-testid='cart-drawer-summary-order-total']");
  private static final By CLEAR_CART = By.cssSelector("[data-testid='cart-drawer-clear-cart']");
  private static final By SHIPPING_INPUTS = By.cssSelector("[data-testid^='cart-drawer-shipping-option-input-']");

  public CartDrawer(WebDriver driver) {
    super(driver);
  }

  public boolean isVisible() {
    return waitForVisible(DRAWER).isDisplayed();
  }

  public void open() {
    if (count(DRAWER) > 0 && driver.findElement(DRAWER).isDisplayed()) {
      return;
    }
    click(CART_BUTTON);
    waitForVisible(DRAWER);
  }

  public int itemCount() {
    waitForVisible(DRAWER);
    return count(CART_ITEMS);
  }

  public void waitUntilOpen() {
    waitForVisible(DRAWER);
  }

  public void increaseFirstItemQuantity() {
    click(FIRST_ITEM_INCREASE);
  }

  public void increaseSecondItemQuantity() {
    List<WebElement> items = driver.findElements(CART_ITEMS);
    if (items.size() < 2) {
      throw new IllegalStateException("Expected at least 2 cart items in the drawer");
    }
    WebElement secondItem = items.get(1);
    WebElement increaseButton = secondItem.findElement(By.cssSelector("[data-testid^='cart-drawer-item-increase-']"));
    increaseButton.click();
  }

  public void selectSecondShippingOption() {
    List<WebElement> inputs = driver.findElements(SHIPPING_INPUTS);
    if (inputs.size() < 2) {
      throw new IllegalStateException("Expected at least 2 shipping options in the cart drawer");
    }
    WebElement secondInput = inputs.get(1);
    if (!secondInput.isSelected()) {
      secondInput.click();
    }
  }

  public boolean isSecondShippingOptionSelected() {
    List<WebElement> inputs = driver.findElements(SHIPPING_INPUTS);
    if (inputs.size() < 2) {
      throw new IllegalStateException("Expected at least 2 shipping options in the cart drawer");
    }
    return inputs.get(1).isSelected();
  }

  public String firstItemQuantity() {
    return text(FIRST_ITEM_QTY);
  }

  public void removeFirstItem() {
    click(FIRST_ITEM_REMOVE);
  }

  public String subtotal() {
    return text(SUBTOTAL);
  }

  public double shippingUsd() {
    String raw = text(SHIPPING).replace("$", "").replace(",", "").trim();
    return Double.parseDouble(raw);
  }

  public double orderTotalUsd() {
    String raw = text(ORDER_TOTAL).replace("$", "").replace(",", "").trim();
    return Double.parseDouble(raw);
  }

  public Map<String, Integer> itemQuantitiesById() {
    waitForVisible(DRAWER);
    Map<String, Integer> quantities = new LinkedHashMap<>();
    for (WebElement item : driver.findElements(CART_ITEMS)) {
      String itemId = item.getDomAttribute("data-testid").replace("cart-drawer-line-item-", "");
      WebElement quantity = item.findElement(By.cssSelector("[data-testid='cart-drawer-item-qty-" + itemId + "']"));
      quantities.put(itemId, Integer.parseInt(quantity.getText().trim()));
    }
    return quantities;
  }

  public void clearCart() {
    click(CLEAR_CART);
  }
}
