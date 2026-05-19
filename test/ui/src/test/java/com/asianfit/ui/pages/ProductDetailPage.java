package com.asianfit.ui.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;

public class ProductDetailPage extends BasePage {
  private static final By ADD_TO_CART_BUTTON = By.cssSelector("[data-testid='add-to-cart-button']");
  private static final By PRICE = By.xpath("//h1/following-sibling::div[contains(@class,'font-semibold')][2]");
  private static final By WEIGHT = By.xpath("//span[normalize-space()='Estimated Weight:']/parent::*");

  public ProductDetailPage(WebDriver driver) {
    super(driver);
  }

  public void addToCart() {
    click(ADD_TO_CART_BUTTON);
  }

  public double weightKg() {
    String raw = text(WEIGHT);
    String normalized = raw.replace("Estimated Weight:", "").replace("kg", "").trim();
    return Double.parseDouble(normalized);
  }

  public double priceUsd() {
    String raw = text(PRICE);
    String normalized = raw.replace("$", "").replace(",", "").trim();
    return Double.parseDouble(normalized);
  }
}
