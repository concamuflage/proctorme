package com.asianfit.ui.utils;

import java.io.IOException;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public final class TestConfig {
  private static final List<Path> LOCAL_ENV_PATHS = List.of(
    Path.of(".env"),
    Path.of(".env.local"),
    Path.of("../.env"),
    Path.of("../.env.local"),
    Path.of("../../.env"),
    Path.of("../../.env.local"),
    Path.of("backend/.env"),
    Path.of("backend/database/.env"),
    Path.of("../backend/.env"),
    Path.of("../backend/database/.env"),
    Path.of("../../backend/.env"),
    Path.of("../../backend/database/.env"),
    Path.of("test/ui/.env"),
    Path.of("test/ui/.env.local")
  );
  private static final Map<String, String> LOCAL_ENV = loadLocalEnv();

  private TestConfig() {}

  public static String baseUrl() {
    String value = System.getProperty("baseUrl");
    if (value != null && !value.isBlank()) {
      return value;
    }

    String nodeEnv = firstNonBlank(
      System.getProperty("nodeEnv"),
      System.getenv("NODE_ENV"),
      LOCAL_ENV.get("NODE_ENV")
    );
    if ("production".equalsIgnoreCase(nodeEnv)) {
      return "https://outlierfit.shop";
    }

    return "http://localhost:3000";
  }

  public static boolean headless() {
    String value = System.getProperty("headless");
    if (value == null || value.isBlank()) {
      return true;
    }
    return Boolean.parseBoolean(value);
  }

  public static boolean productionMode() {
    String nodeEnv = firstNonBlank(
      System.getProperty("nodeEnv"),
      System.getenv("NODE_ENV"),
      LOCAL_ENV.get("NODE_ENV")
    );
    return "production".equalsIgnoreCase(nodeEnv);
  }

  public static String testUserEmail() {
    String value = System.getProperty("testUserEmail");
    if (value == null || value.isBlank()) {
      value = System.getenv("TEST_USER_EMAIL");
    }
    if (value == null || value.isBlank()) {
      value = LOCAL_ENV.get("TEST_USER_EMAIL");
    }
    if (value == null || value.isBlank()) {
      throw new IllegalStateException(
        "Missing test user email. Set -DtestUserEmail, TEST_USER_EMAIL, or test/ui/.env.local for login-required UI tests"
      );
    }
    return value;
  }

  public static String databaseUrl() {
    String value = configuredDatabaseUrl();
    if (value == null || value.isBlank()) {
      String host = firstNonBlank(
        System.getProperty("pgHost"),
        System.getenv("PGHOST"),
        LOCAL_ENV.get("PGHOST")
      );
      String port = firstNonBlank(
        System.getProperty("pgPort"),
        System.getenv("PGPORT"),
        LOCAL_ENV.get("PGPORT"),
        "5432"
      );
      String database = firstNonBlank(
        System.getProperty("pgDatabase"),
        System.getenv("PGDATABASE"),
        LOCAL_ENV.get("PGDATABASE")
      );

      if (host != null && database != null) {
        value = "jdbc:postgresql://" + host + ":" + port + "/" + database;
      }
    }
    if (value == null || value.isBlank()) {
      throw new IllegalStateException(
        "Missing database connection. Set -DtestDatabaseUrl, TEST_DATABASE_URL, DATABASE_URL, or PGHOST/PGPORT/PGDATABASE in test/ui/.env.local"
      );
    }
    return toJdbcUrl(value);
  }

  public static String databaseUser() {
    String value = firstNonBlank(
      System.getProperty("pgUser"),
      System.getenv("PGUSER"),
      LOCAL_ENV.get("PGUSER"),
      databaseUrlUsername()
    );
    if (value == null) {
      throw new IllegalStateException(
        "Missing database user. Set -DpgUser, PGUSER, or test/ui/.env.local"
      );
    }
    return value;
  }

  public static String databasePassword() {
    String value = firstNonBlank(
      System.getProperty("pgPassword"),
      System.getenv("PGPASSWORD"),
      LOCAL_ENV.get("PGPASSWORD"),
      databaseUrlPassword()
    );
    if (value == null) {
      throw new IllegalStateException(
        "Missing database password. Set -DpgPassword, PGPASSWORD, or test/ui/.env.local"
      );
    }
    return value;
  }

  public static String signupUserEmail() {
    String value = System.getProperty("testSignupEmail");
    if (value == null || value.isBlank()) {
      value = System.getenv("TEST_SIGNUP_EMAIL");
    }
    if (value == null || value.isBlank()) {
      value = LOCAL_ENV.get("TEST_SIGNUP_EMAIL");
    }
    return value;
  }

  public static String signupUserPassword() {
    String value = System.getProperty("testSignupPassword");
    if (value == null || value.isBlank()) {
      value = System.getenv("TEST_SIGNUP_PASSWORD");
    }
    if (value == null || value.isBlank()) {
      value = LOCAL_ENV.get("TEST_SIGNUP_PASSWORD");
    }
    if (value == null || value.isBlank()) {
      value = "StrongPass123A";
    }
    return value;
  }

  public static String testUserPassword() {
    String value = System.getProperty("testUserPassword");
    if (value == null || value.isBlank()) {
      value = System.getenv("TEST_USER_PASSWORD");
    }
    if (value == null || value.isBlank()) {
      value = LOCAL_ENV.get("TEST_USER_PASSWORD");
    }
    if (value == null || value.isBlank()) {
      throw new IllegalStateException(
        "Missing test user password. Set -DtestUserPassword, TEST_USER_PASSWORD, or test/ui/.env.local for login-required UI tests"
      );
    }
    return value;
  }

  public static String stripeWebhookSecret() {
    String value = firstNonBlank(
      System.getProperty("stripeWebhookSecret"),
      System.getenv("STRIPE_WEBHOOK_SECRET"),
      LOCAL_ENV.get("STRIPE_WEBHOOK_SECRET")
    );
    if (value == null) {
      throw new IllegalStateException(
        "Missing Stripe webhook secret. Set -DstripeWebhookSecret, STRIPE_WEBHOOK_SECRET, or .env.local"
      );
    }
    return value;
  }

  public static String googleClientId() {
    String value = firstNonBlank(
      System.getProperty("googleClientId"),
      System.getenv("GOOGLE_CLIENT_ID"),
      LOCAL_ENV.get("GOOGLE_CLIENT_ID")
    );
    if (value == null || "change-me".equals(value)) {
      throw new IllegalStateException(
        "Missing Google client ID. Set -DgoogleClientId, GOOGLE_CLIENT_ID, or .env.local"
      );
    }
    return value;
  }

  public static String googleClientSecret() {
    String value = firstNonBlank(
      System.getProperty("googleClientSecret"),
      System.getenv("GOOGLE_CLIENT_SECRET"),
      LOCAL_ENV.get("GOOGLE_CLIENT_SECRET")
    );
    if (value == null || "change-me".equals(value)) {
      throw new IllegalStateException(
        "Missing Google client secret. Set -DgoogleClientSecret, GOOGLE_CLIENT_SECRET, or .env.local"
      );
    }
    return value;
  }

  public static String gmailAccessToken() {
    return firstNonBlank(
      System.getProperty("gmailAccessToken"),
      System.getenv("GMAIL_ACCESS_TOKEN"),
      LOCAL_ENV.get("GMAIL_ACCESS_TOKEN")
    );
  }

  public static String gmailRefreshToken() {
    return firstNonBlank(
      System.getProperty("gmailRefreshToken"),
      System.getenv("GMAIL_REFRESH_TOKEN"),
      LOCAL_ENV.get("GMAIL_REFRESH_TOKEN")
    );
  }

  public static String resendFromEmail() {
    String value = firstNonBlank(
      System.getProperty("resendFromEmail"),
      System.getenv("RESEND_FROM_EMAIL"),
      LOCAL_ENV.get("RESEND_FROM_EMAIL")
    );
    if (value == null) {
      throw new IllegalStateException(
        "Missing expected sender email. Set -DresendFromEmail, RESEND_FROM_EMAIL, or backend/.env"
      );
    }
    return value;
  }

  public static String invoiceStoreEmail() {
    return firstNonBlank(
      System.getProperty("invoiceStoreEmail"),
      System.getenv("INVOICE_STORE_EMAIL"),
      LOCAL_ENV.get("INVOICE_STORE_EMAIL"),
      "unodostreszlm@gmail.com"
    );
  }

  public static String unverifiedTestUserEmail() {
    String value = System.getProperty("unverifiedTestUserEmail");
    if (value == null || value.isBlank()) {
      value = System.getenv("TEST_UNVERIFIED_USER_EMAIL");
    }
    if (value == null || value.isBlank()) {
      value = LOCAL_ENV.get("TEST_UNVERIFIED_USER_EMAIL");
    }
    if (value == null || value.isBlank()) {
      throw new IllegalStateException(
        "Missing unverified test user email. Set -DunverifiedTestUserEmail, TEST_UNVERIFIED_USER_EMAIL, or test/ui/.env.local"
      );
    }
    return value;
  }

  public static String unverifiedTestUserPassword() {
    String value = System.getProperty("unverifiedTestUserPassword");
    if (value == null || value.isBlank()) {
      value = System.getenv("TEST_UNVERIFIED_USER_PASSWORD");
    }
    if (value == null || value.isBlank()) {
      value = LOCAL_ENV.get("TEST_UNVERIFIED_USER_PASSWORD");
    }
    if (value == null || value.isBlank()) {
      throw new IllegalStateException(
        "Missing unverified test user password. Set -DunverifiedTestUserPassword, TEST_UNVERIFIED_USER_PASSWORD, or test/ui/.env.local"
      );
    }
    return value;
  }

  private static Map<String, String> loadLocalEnv() {
    Map<String, String> values = new HashMap<>();
    for (Path localEnvPath : LOCAL_ENV_PATHS) {
      if (!Files.exists(localEnvPath)) {
        continue;
      }

      try {
        List<String> lines = Files.readAllLines(localEnvPath);
        for (String rawLine : lines) {
          String line = rawLine.trim();
          if (line.isEmpty() || line.startsWith("#")) {
            continue;
          }

          int separatorIndex = line.indexOf('=');
          if (separatorIndex <= 0) {
            continue;
          }

          String key = line.substring(0, separatorIndex).trim();
          String value = line.substring(separatorIndex + 1).trim();
          values.put(key, stripWrappingQuotes(value));
        }
      } catch (IOException e) {
        throw new IllegalStateException("Failed to read " + localEnvPath, e);
      }
    }

    return values;
  }

  private static String stripWrappingQuotes(String value) {
    if (value.length() >= 2) {
      boolean wrappedInDoubleQuotes = value.startsWith("\"") && value.endsWith("\"");
      boolean wrappedInSingleQuotes = value.startsWith("'") && value.endsWith("'");
      if (wrappedInDoubleQuotes || wrappedInSingleQuotes) {
        return value.substring(1, value.length() - 1);
      }
    }
    return value;
  }

  private static String firstNonBlank(String... values) {
    for (String value : values) {
      if (value != null && !value.isBlank()) {
        return value;
      }
    }
    return null;
  }

  private static String toJdbcUrl(String value) {
    if (value.startsWith("jdbc:postgresql://")) {
      return stripJdbcUserInfo(value);
    }
    if (value.startsWith("postgresql://")) {
      return postgresUrlToJdbcUrl(value);
    }
    if (value.startsWith("postgres://")) {
      return postgresUrlToJdbcUrl(value);
    }
    return value;
  }

  private static String configuredDatabaseUrl() {
    return firstNonBlank(
      System.getProperty("testDatabaseUrl"),
      System.getenv("TEST_DATABASE_URL"),
      LOCAL_ENV.get("TEST_DATABASE_URL"),
      System.getenv("DATABASE_URL"),
      LOCAL_ENV.get("DATABASE_URL")
    );
  }

  private static String databaseUrlUsername() {
    String userInfo = databaseUrlUserInfo();
    if (userInfo == null || userInfo.isBlank()) {
      return null;
    }

    int passwordSeparator = userInfo.indexOf(':');
    String username = passwordSeparator >= 0 ? userInfo.substring(0, passwordSeparator) : userInfo;
    return decodeUrlPart(username);
  }

  private static String databaseUrlPassword() {
    String userInfo = databaseUrlUserInfo();
    if (userInfo == null || userInfo.isBlank()) {
      return null;
    }

    int passwordSeparator = userInfo.indexOf(':');
    if (passwordSeparator < 0 || passwordSeparator == userInfo.length() - 1) {
      return null;
    }

    return decodeUrlPart(userInfo.substring(passwordSeparator + 1));
  }

  private static String databaseUrlUserInfo() {
    URI uri = postgresUri(configuredDatabaseUrl());
    return uri == null ? null : uri.getRawUserInfo();
  }

  private static String postgresUrlToJdbcUrl(String value) {
    URI uri = postgresUri(value);
    if (uri == null || uri.getHost() == null) {
      return "jdbc:postgresql://" + value.substring(value.indexOf("://") + 3);
    }

    StringBuilder jdbcUrl = new StringBuilder("jdbc:postgresql://").append(uri.getHost());
    if (uri.getPort() > 0) {
      jdbcUrl.append(':').append(uri.getPort());
    }
    if (uri.getRawPath() != null && !uri.getRawPath().isBlank()) {
      jdbcUrl.append(uri.getRawPath());
    }
    if (uri.getRawQuery() != null && !uri.getRawQuery().isBlank()) {
      jdbcUrl.append('?').append(uri.getRawQuery());
    }
    return jdbcUrl.toString();
  }

  private static URI postgresUri(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }
    if (value.startsWith("jdbc:postgresql://")) {
      return URI.create("postgresql://" + value.substring("jdbc:postgresql://".length()));
    }
    if (value.startsWith("postgresql://") || value.startsWith("postgres://")) {
      return URI.create(value);
    }
    return null;
  }

  private static String stripJdbcUserInfo(String value) {
    URI uri = postgresUri(value);
    if (uri == null || uri.getRawUserInfo() == null) {
      return value;
    }
    return postgresUrlToJdbcUrl("postgresql://" + value.substring("jdbc:postgresql://".length()));
  }

  private static String decodeUrlPart(String value) {
    return URLDecoder.decode(value, StandardCharsets.UTF_8);
  }
}
