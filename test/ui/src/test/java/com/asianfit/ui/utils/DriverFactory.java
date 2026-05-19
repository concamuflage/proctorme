package com.asianfit.ui.utils;

import io.github.bonigarcia.wdm.WebDriverManager;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;

public final class DriverFactory {
  private static final ThreadLocal<WebDriver> DRIVER = new ThreadLocal<>();

  private DriverFactory() {}

  public static void createDriver() {
    if (Files.isExecutable(Path.of("/usr/bin/chromedriver"))) {
      System.setProperty("webdriver.chrome.driver", "/usr/bin/chromedriver");
    } else {
      WebDriverManager.chromedriver().setup();
    }

    ChromeOptions options = new ChromeOptions();
    options.addArguments("--window-size=1600,1200");
    options.addArguments("--no-sandbox");
    options.addArguments("--disable-dev-shm-usage");
    if (TestConfig.headless()) {
      options.addArguments("--headless=new");
    }
    if (Files.isExecutable(Path.of("/usr/bin/chromium"))) {
      options.setBinary("/usr/bin/chromium");
    } else if (Files.isExecutable(Path.of("/usr/bin/chromium-browser"))) {
      options.setBinary("/usr/bin/chromium-browser");
    }

    WebDriver driver = new ChromeDriver(options);
    driver.manage().timeouts().implicitlyWait(Duration.ofSeconds(10));
    DRIVER.set(driver);
  }

  public static WebDriver getDriver() {
    return DRIVER.get();
  }

  public static void quitDriver() {
    WebDriver driver = DRIVER.get();
    if (driver != null) {
      driver.quit();
      DRIVER.remove();
    }
  }
}
