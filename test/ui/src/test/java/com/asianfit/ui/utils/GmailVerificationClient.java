package com.asianfit.ui.utils;

import io.restassured.path.json.JsonPath;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class GmailVerificationClient {
  private static final Pattern VERIFICATION_LINK_PATTERN =
    Pattern.compile("https?://[^\\s\"'<>]+/verify-email\\?[^\\s\"'<>]+");
  private static final Pattern PASSWORD_RESET_LINK_PATTERN =
    Pattern.compile("https?://[^\\s\"'<>]+/reset-password\\?[^\\s\"'<>]+");
  private static final Pattern INVOICE_LINK_PATTERN =
    Pattern.compile("https?://[^\\s\"'<>]+/api/profile/orders/\\d+/invoice/pdf");
  private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(15);
  private static final HttpClient HTTP_CLIENT = HttpClient
    .newBuilder()
    .connectTimeout(REQUEST_TIMEOUT)
    .build();

  private GmailVerificationClient() {}

  public static VerificationEmail findLatestVerificationEmail(String recipientEmail) {
    String accessToken = accessToken();
    String query = "to:" + recipientEmail + " subject:\"Verify your OutlierFit account\" newer_than:14d";
    String listUrl = "https://gmail.googleapis.com/gmail/v1/users/me/messages"
      + "?maxResults=10"
      + "&includeSpamTrash=true"
      + "&q=" + urlEncode(query);

    Map<String, Object> listPayload = getJson(listUrl, accessToken);
    List<Map<String, Object>> messages = listPayloadValue(listPayload, "messages");
    if (messages == null || messages.isEmpty()) {
      throw new IllegalStateException("No Gmail verification emails found for " + recipientEmail);
    }

    for (Map<String, Object> messageSummary : messages) {
      String messageId = String.valueOf(messageSummary.get("id"));
      Map<String, Object> message = getJson(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages/" + messageId + "?format=full",
        accessToken
      );
      String link = extractVerificationLink(message);
      if (link != null) {
        return new VerificationEmail(
          decodeHtmlEntities(link),
          headerValue(message, "From")
        );
      }
    }

    throw new IllegalStateException("Gmail messages were found, but none contained a verification link.");
  }

  public static String findLatestVerificationLink(String recipientEmail) {
    return findLatestVerificationEmail(recipientEmail).verificationLink();
  }

  public static String findLatestPasswordResetLink(String recipientEmail) {
    return findLatestLink(
      recipientEmail,
      "Reset your OutlierFit password",
      PASSWORD_RESET_LINK_PATTERN,
      "/reset-password?",
      "password reset"
    );
  }

  public static InvoiceEmail findLatestCustomerInvoiceEmail(String recipientEmail) {
    return findLatestInvoiceEmail(
      recipientEmail,
      "Your OutlierFit invoice",
      "Hi there",
      "customer invoice"
    );
  }

  public static InvoiceEmail findLatestStoreInvoiceEmail(String recipientEmail) {
    return findLatestInvoiceEmail(
      recipientEmail,
      "Paid order invoice",
      "Hi OutlierFit team",
      "store invoice notification"
    );
  }

  private static InvoiceEmail findLatestInvoiceEmail(
    String recipientEmail,
    String subject,
    String requiredBodyText,
    String linkDescription
  ) {
    String accessToken = accessToken();
    String query = "to:" + recipientEmail + " subject:\"" + subject + "\" newer_than:14d";
    String listUrl = "https://gmail.googleapis.com/gmail/v1/users/me/messages"
      + "?maxResults=10"
      + "&includeSpamTrash=true"
      + "&q=" + urlEncode(query);

    Map<String, Object> listPayload = getJson(listUrl, accessToken);
    List<Map<String, Object>> messages = listPayloadValue(listPayload, "messages");
    if (messages == null || messages.isEmpty()) {
      throw new IllegalStateException("No Gmail " + linkDescription + " emails found for " + recipientEmail);
    }

    for (Map<String, Object> messageSummary : messages) {
      String messageId = String.valueOf(messageSummary.get("id"));
      Map<String, Object> message = getJson(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages/" + messageId + "?format=full",
        accessToken
      );
      String body = messageBody(message);
      if (!body.contains(requiredBodyText)) {
        continue;
      }

      String link = extractInvoiceLink(body);
      if (link != null) {
        return new InvoiceEmail(
          decodeHtmlEntities(link),
          headerValue(message, "From"),
          body
        );
      }
    }

    throw new IllegalStateException("Gmail messages were found, but none contained a " + linkDescription + " link.");
  }

  private static String findLatestLink(
    String recipientEmail,
    String subject,
    Pattern linkPattern,
    String requiredPath,
    String linkDescription
  ) {
    String accessToken = accessToken();
    String query = "to:" + recipientEmail + " subject:\"" + subject + "\" newer_than:14d";
    String listUrl = "https://gmail.googleapis.com/gmail/v1/users/me/messages"
      + "?maxResults=10"
      + "&includeSpamTrash=true"
      + "&q=" + urlEncode(query);

    Map<String, Object> listPayload = getJson(listUrl, accessToken);
    List<Map<String, Object>> messages = listPayloadValue(listPayload, "messages");
    if (messages == null || messages.isEmpty()) {
      throw new IllegalStateException("No Gmail " + linkDescription + " emails found for " + recipientEmail);
    }

    for (Map<String, Object> messageSummary : messages) {
      String messageId = String.valueOf(messageSummary.get("id"));
      Map<String, Object> message = getJson(
        "https://gmail.googleapis.com/gmail/v1/users/me/messages/" + messageId + "?format=full",
        accessToken
      );
      String link = extractLink(message, linkPattern, requiredPath);
      if (link != null) {
        return decodeHtmlEntities(link);
      }
    }

    throw new IllegalStateException("Gmail messages were found, but none contained a " + linkDescription + " link.");
  }

  private static String accessToken() {
    String configuredAccessToken = TestConfig.gmailAccessToken();
    if (configuredAccessToken != null && !configuredAccessToken.isBlank()) {
      return configuredAccessToken;
    }

    String refreshToken = TestConfig.gmailRefreshToken();
    if (refreshToken == null || refreshToken.isBlank()) {
      throw new IllegalStateException(
        "Missing Gmail API token. Set GMAIL_ACCESS_TOKEN for a short-lived run, or GMAIL_REFRESH_TOKEN for repeatable tests."
      );
    }

    String formBody = "client_id=" + urlEncode(TestConfig.googleClientId())
      + "&client_secret=" + urlEncode(TestConfig.googleClientSecret())
      + "&refresh_token=" + urlEncode(refreshToken)
      + "&grant_type=refresh_token";

    HttpRequest request = HttpRequest
      .newBuilder(URI.create("https://oauth2.googleapis.com/token"))
      .timeout(REQUEST_TIMEOUT)
      .header("Content-Type", "application/x-www-form-urlencoded")
      .POST(HttpRequest.BodyPublishers.ofString(formBody))
      .build();

    Map<String, Object> payload = sendJson(request);
    Object token = payload.get("access_token");
    if (token == null || String.valueOf(token).isBlank()) {
      throw new IllegalStateException("Google token response did not include access_token.");
    }
    return String.valueOf(token);
  }

  private static Map<String, Object> getJson(String url, String accessToken) {
    HttpRequest request = HttpRequest
      .newBuilder(URI.create(url))
      .timeout(REQUEST_TIMEOUT)
      .header("Authorization", "Bearer " + accessToken)
      .GET()
      .build();
    return sendJson(request);
  }

  private static Map<String, Object> sendJson(HttpRequest request) {
    try {
      HttpResponse<String> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString());
      if (response.statusCode() < 200 || response.statusCode() >= 300) {
        throw new IllegalStateException(
          request.uri() + " failed with " + response.statusCode() + ": " + response.body()
        );
      }
      return JsonPath.from(response.body()).getMap("$");
    } catch (IOException e) {
      throw new IllegalStateException("Failed to call " + request.uri(), e);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw new IllegalStateException("Interrupted while calling " + request.uri(), e);
    }
  }

  @SuppressWarnings("unchecked")
  private static List<Map<String, Object>> listPayloadValue(Map<String, Object> payload, String key) {
    return (List<Map<String, Object>>) payload.get(key);
  }

  @SuppressWarnings("unchecked")
  private static String extractVerificationLink(Map<String, Object> message) {
    StringBuilder body = new StringBuilder();
    collectBodyParts((Map<String, Object>) message.get("payload"), body);

    Matcher matcher = VERIFICATION_LINK_PATTERN.matcher(body.toString());
    while (matcher.find()) {
      String link = matcher.group();
      if (link.contains("email=") && link.contains("token=")) {
        return link;
      }
    }

    return null;
  }

  @SuppressWarnings("unchecked")
  private static String extractLink(Map<String, Object> message, Pattern linkPattern, String requiredPath) {
    Matcher matcher = linkPattern.matcher(messageBody(message));
    while (matcher.find()) {
      String link = matcher.group();
      if (link.contains(requiredPath) && link.contains("email=") && link.contains("token=")) {
        return link;
      }
    }

    return null;
  }

  @SuppressWarnings("unchecked")
  private static String messageBody(Map<String, Object> message) {
    StringBuilder body = new StringBuilder();
    collectBodyParts((Map<String, Object>) message.get("payload"), body);
    return body.toString();
  }

  private static String extractInvoiceLink(String body) {
    Matcher matcher = INVOICE_LINK_PATTERN.matcher(body);
    while (matcher.find()) {
      return decodeHtmlEntities(matcher.group());
    }
    return null;
  }

  @SuppressWarnings("unchecked")
  private static String headerValue(Map<String, Object> message, String headerName) {
    Object payloadObject = message.get("payload");
    if (!(payloadObject instanceof Map<?, ?> payload)) return "";

    Object headersObject = payload.get("headers");
    if (!(headersObject instanceof List<?> headers)) return "";

    for (Object headerObject : headers) {
      Map<String, Object> header = (Map<String, Object>) headerObject;
      if (headerName.equalsIgnoreCase(String.valueOf(header.get("name")))) {
        return String.valueOf(header.get("value"));
      }
    }

    return "";
  }

  @SuppressWarnings("unchecked")
  private static void collectBodyParts(Map<String, Object> part, StringBuilder body) {
    if (part == null) return;

    Object bodyObject = part.get("body");
    if (bodyObject instanceof Map<?, ?> rawBody) {
      Object data = rawBody.get("data");
      if (data != null && !String.valueOf(data).isBlank()) {
        body.append(base64UrlDecode(String.valueOf(data))).append('\n');
      }
    }

    Object partsObject = part.get("parts");
    if (partsObject instanceof List<?> parts) {
      for (Object child : parts) {
        collectBodyParts((Map<String, Object>) child, body);
      }
    }
  }

  private static String base64UrlDecode(String value) {
    return new String(Base64.getUrlDecoder().decode(value), StandardCharsets.UTF_8);
  }

  private static String decodeHtmlEntities(String value) {
    return value
      .replace("&amp;", "&")
      .replace("&lt;", "<")
      .replace("&gt;", ">")
      .replace("&quot;", "\"")
      .replace("&#39;", "'");
  }

  private static String urlEncode(String value) {
    return URLEncoder.encode(value, StandardCharsets.UTF_8);
  }

  public record VerificationEmail(
    String verificationLink,
    String from
  ) {}

  public record InvoiceEmail(
    String invoiceLink,
    String from,
    String body
  ) {}
}
