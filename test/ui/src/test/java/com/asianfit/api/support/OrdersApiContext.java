package com.asianfit.api.support;

import io.restassured.http.Cookies;
import io.restassured.response.Response;

public final class OrdersApiContext {
  // static is shared across all instances/threads, so we use ThreadLocal to ensure thread safety for test data
  // this is necessary because tests may run in parallel and we want to avoid interference between them when they access shared data

  private static final ThreadLocal<Cookies> AUTH_COOKIES = new ThreadLocal<>();
  private static final ThreadLocal<Response> PROFILE_RESPONSE = new ThreadLocal<>();
  private static final ThreadLocal<Response> ACCOUNT_DELETE_RESPONSE = new ThreadLocal<>();
  private static final ThreadLocal<Response> CART_RESPONSE = new ThreadLocal<>();
  private static final ThreadLocal<Response> MOCK_PAYMENT_RESPONSE = new ThreadLocal<>();
  private static final ThreadLocal<OrdersApiSupport.OrderFixture> FIXTURE = new ThreadLocal<>();
  private static final ThreadLocal<OrdersApiSupport.CheckoutFixture> CHECKOUT_FIXTURE = new ThreadLocal<>();
  private static final ThreadLocal<OrdersApiSupport.DisposableAccount> DISPOSABLE_ACCOUNT = new ThreadLocal<>();
  private static final ThreadLocal<OrdersApiSupport.MeasurementSnapshot> ORIGINAL_MEASUREMENT = new ThreadLocal<>();
  private static final ThreadLocal<OrdersApiSupport.MeasurementSnapshot> TARGET_MEASUREMENT = new ThreadLocal<>();
  private static final ThreadLocal<OrdersApiSupport.AddressPayload> TARGET_ADDRESS = new ThreadLocal<>();
  private static final ThreadLocal<Integer> TARGET_ADDRESS_ID = new ThreadLocal<>();
  private static final ThreadLocal<Response> ALL_ORDERS_RESPONSE = new ThreadLocal<>();
  private static final ThreadLocal<Response> SINGLE_ORDER_RESPONSE = new ThreadLocal<>();
  private static final ThreadLocal<Response> INVOICE_PAYLOAD_RESPONSE = new ThreadLocal<>();
  private static final ThreadLocal<Response> ORDER_INVOICE_PDF_RESPONSE = new ThreadLocal<>();
  private static final ThreadLocal<Response> GENERATED_INVOICE_PDF_RESPONSE = new ThreadLocal<>();
  private static final ThreadLocal<Long> RETRIEVED_ORDER_ID = new ThreadLocal<>();
  private static final ThreadLocal<Response> STRIPE_WEBHOOK_RESPONSE = new ThreadLocal<>();
  private static final ThreadLocal<Response> STRIPE_SECOND_WEBHOOK_RESPONSE = new ThreadLocal<>();
  private static final ThreadLocal<String> STRIPE_CHECKOUT_SESSION_ID = new ThreadLocal<>();
  private static final ThreadLocal<String> STRIPE_PAYMENT_INTENT_ID = new ThreadLocal<>();
  private static final ThreadLocal<String> STRIPE_WEBHOOK_EVENT_ID = new ThreadLocal<>();
  private static final ThreadLocal<String> STRIPE_DUPLICATE_WEBHOOK_EVENT_ID = new ThreadLocal<>();

  private OrdersApiContext() {}

  public static Cookies authCookies() {
    return AUTH_COOKIES.get();
  }

  public static void setAuthCookies(Cookies cookies) {
    AUTH_COOKIES.set(cookies);
  }

  public static Response profileResponse() {
    return PROFILE_RESPONSE.get();
  }

  public static void setProfileResponse(Response response) {
    PROFILE_RESPONSE.set(response);
  }

  public static Response accountDeleteResponse() {
    return ACCOUNT_DELETE_RESPONSE.get();
  }

  public static void setAccountDeleteResponse(Response response) {
    ACCOUNT_DELETE_RESPONSE.set(response);
  }

  public static Response cartResponse() {
    return CART_RESPONSE.get();
  }

  public static void setCartResponse(Response response) {
    CART_RESPONSE.set(response);
  }

  public static Response mockPaymentResponse() {
    return MOCK_PAYMENT_RESPONSE.get();
  }

  public static void setMockPaymentResponse(Response response) {
    MOCK_PAYMENT_RESPONSE.set(response);
  }

  public static OrdersApiSupport.OrderFixture fixture() {
    return FIXTURE.get();
  }

  public static void setFixture(OrdersApiSupport.OrderFixture fixture) {
    FIXTURE.set(fixture);
  }

  public static OrdersApiSupport.CheckoutFixture checkoutFixture() {
    return CHECKOUT_FIXTURE.get();
  }

  public static void setCheckoutFixture(OrdersApiSupport.CheckoutFixture fixture) {
    CHECKOUT_FIXTURE.set(fixture);
  }

  public static OrdersApiSupport.DisposableAccount disposableAccount() {
    return DISPOSABLE_ACCOUNT.get();
  }

  public static void setDisposableAccount(OrdersApiSupport.DisposableAccount account) {
    DISPOSABLE_ACCOUNT.set(account);
  }

  public static OrdersApiSupport.MeasurementSnapshot originalMeasurement() {
    return ORIGINAL_MEASUREMENT.get();
  }

  public static void setOriginalMeasurement(OrdersApiSupport.MeasurementSnapshot snapshot) {
    ORIGINAL_MEASUREMENT.set(snapshot);
  }

  public static OrdersApiSupport.MeasurementSnapshot targetMeasurement() {
    return TARGET_MEASUREMENT.get();
  }

  public static void setTargetMeasurement(OrdersApiSupport.MeasurementSnapshot snapshot) {
    TARGET_MEASUREMENT.set(snapshot);
  }

  public static OrdersApiSupport.AddressPayload targetAddress() {
    return TARGET_ADDRESS.get();
  }

  public static void setTargetAddress(OrdersApiSupport.AddressPayload address) {
    TARGET_ADDRESS.set(address);
  }

  public static Integer targetAddressId() {
    return TARGET_ADDRESS_ID.get();
  }

  public static void setTargetAddressId(Integer addressId) {
    TARGET_ADDRESS_ID.set(addressId);
  }

  public static Response allOrdersResponse() {
    return ALL_ORDERS_RESPONSE.get();
  }

  public static void setAllOrdersResponse(Response response) {
    ALL_ORDERS_RESPONSE.set(response);
  }

  public static Response singleOrderResponse() {
    return SINGLE_ORDER_RESPONSE.get();
  }

  public static void setSingleOrderResponse(Response response) {
    SINGLE_ORDER_RESPONSE.set(response);
  }

  public static Response invoicePayloadResponse() {
    return INVOICE_PAYLOAD_RESPONSE.get();
  }

  public static void setInvoicePayloadResponse(Response response) {
    INVOICE_PAYLOAD_RESPONSE.set(response);
  }

  public static Response orderInvoicePdfResponse() {
    return ORDER_INVOICE_PDF_RESPONSE.get();
  }

  public static void setOrderInvoicePdfResponse(Response response) {
    ORDER_INVOICE_PDF_RESPONSE.set(response);
  }

  public static Response generatedInvoicePdfResponse() {
    return GENERATED_INVOICE_PDF_RESPONSE.get();
  }

  public static void setGeneratedInvoicePdfResponse(Response response) {
    GENERATED_INVOICE_PDF_RESPONSE.set(response);
  }

  public static Long retrievedOrderId() {
    return RETRIEVED_ORDER_ID.get();
  }

  public static void setRetrievedOrderId(long orderId) {
    RETRIEVED_ORDER_ID.set(orderId);
  }

  public static Response stripeWebhookResponse() {
    return STRIPE_WEBHOOK_RESPONSE.get();
  }

  public static void setStripeWebhookResponse(Response response) {
    STRIPE_WEBHOOK_RESPONSE.set(response);
  }

  public static Response stripeSecondWebhookResponse() {
    return STRIPE_SECOND_WEBHOOK_RESPONSE.get();
  }

  public static void setStripeSecondWebhookResponse(Response response) {
    STRIPE_SECOND_WEBHOOK_RESPONSE.set(response);
  }

  public static String stripeCheckoutSessionId() {
    return STRIPE_CHECKOUT_SESSION_ID.get();
  }

  public static void setStripeCheckoutSessionId(String sessionId) {
    STRIPE_CHECKOUT_SESSION_ID.set(sessionId);
  }

  public static String stripePaymentIntentId() {
    return STRIPE_PAYMENT_INTENT_ID.get();
  }

  public static void setStripePaymentIntentId(String paymentIntentId) {
    STRIPE_PAYMENT_INTENT_ID.set(paymentIntentId);
  }

  public static String stripeWebhookEventId() {
    return STRIPE_WEBHOOK_EVENT_ID.get();
  }

  public static void setStripeWebhookEventId(String eventId) {
    STRIPE_WEBHOOK_EVENT_ID.set(eventId);
  }

  public static String stripeDuplicateWebhookEventId() {
    return STRIPE_DUPLICATE_WEBHOOK_EVENT_ID.get();
  }

  public static void setStripeDuplicateWebhookEventId(String eventId) {
    STRIPE_DUPLICATE_WEBHOOK_EVENT_ID.set(eventId);
  }

  public static void clear() {
    AUTH_COOKIES.remove();
    PROFILE_RESPONSE.remove();
    CART_RESPONSE.remove();
    MOCK_PAYMENT_RESPONSE.remove();
    FIXTURE.remove();
    CHECKOUT_FIXTURE.remove();
    ORIGINAL_MEASUREMENT.remove();
    TARGET_MEASUREMENT.remove();
    TARGET_ADDRESS.remove();
    TARGET_ADDRESS_ID.remove();
    ALL_ORDERS_RESPONSE.remove();
    SINGLE_ORDER_RESPONSE.remove();
    INVOICE_PAYLOAD_RESPONSE.remove();
    ORDER_INVOICE_PDF_RESPONSE.remove();
    GENERATED_INVOICE_PDF_RESPONSE.remove();
    RETRIEVED_ORDER_ID.remove();
    STRIPE_WEBHOOK_RESPONSE.remove();
    STRIPE_SECOND_WEBHOOK_RESPONSE.remove();
    STRIPE_CHECKOUT_SESSION_ID.remove();
    STRIPE_PAYMENT_INTENT_ID.remove();
    STRIPE_WEBHOOK_EVENT_ID.remove();
    STRIPE_DUPLICATE_WEBHOOK_EVENT_ID.remove();
  }
}
