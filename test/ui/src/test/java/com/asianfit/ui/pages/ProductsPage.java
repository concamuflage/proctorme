package com.asianfit.ui.pages;

import com.asianfit.ui.utils.TestConfig;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;

public class ProductsPage extends BasePage {
  private static final By FIRST_PRODUCT_CARD = By.cssSelector("[data-testid^='product-card-']");

  public ProductsPage(WebDriver driver) {
    super(driver);
  }

  public void open() {
    driver.get(TestConfig.baseUrl() + "/products");
    waitForVisible(FIRST_PRODUCT_CARD);
  }

  public void openFirstProduct() {
    click(FIRST_PRODUCT_CARD);
  }

  public void selectFilter(String filterName) {
    click(By.xpath("//*[@data-testid='" + filterTestId(filterName) + "']"));
  }

  public boolean showsAllFilter() {
    try {
      return waitForVisible(By.xpath("//*[@data-testid='" + filterTestId("All") + "']")).isDisplayed();
    } catch (Exception ignored) {
      return false;
    }
  }

  public void openProtectedCartPage() {
    driver.get(TestConfig.baseUrl() + "/cart");
  }

  private String filterTestId(String filterName) {
    return "products-filter-" + filterName.toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("(^-+|-+$)", "");
  }
}
