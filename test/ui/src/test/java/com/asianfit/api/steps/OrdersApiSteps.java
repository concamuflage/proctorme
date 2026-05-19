package com.asianfit.api.steps;

import com.asianfit.api.support.OrdersApiContext;
import com.asianfit.api.support.OrdersApiSupport;
import io.cucumber.java.en.Given;
import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;
import io.restassured.response.Response;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import com.asianfit.ui.utils.TestConfig;
import org.testng.Assert;

public class OrdersApiSteps {
  private static final String PDF_CONTENT_TYPE = "application/pdf";

  private String formatShippingMode(String mode) {
    if ("hybrid".equals(mode)) {
      return "Air Sea Land";
    }
    if ("sea_land".equals(mode)) {
      return "Sea Land";
    }
    if (mode == null || mode.isBlank()) {
      return "";
    }
    return Character.toUpperCase(mode.charAt(0)) + mode.substring(1);
  }

  private OrdersApiSupport.MeasurementSnapshot nextMeasurementSnapshot(
    OrdersApiSupport.MeasurementSnapshot current
  ) {
    BigDecimal height = current.heightCm() == null ? BigDecimal.valueOf(170) : current.heightCm().add(BigDecimal.ONE);
    BigDecimal chest = current.chestCm() == null ? BigDecimal.valueOf(95) : current.chestCm().add(BigDecimal.ONE);
    BigDecimal sleeve = current.sleeveLengthCm() == null ? BigDecimal.valueOf(61) : current.sleeveLengthCm().add(BigDecimal.ONE);
    return new OrdersApiSupport.MeasurementSnapshot(null, height, chest, sleeve, true);
  }

  private OrdersApiSupport.AddressPayload nextBillingAddress() {
    long suffix = System.currentTimeMillis() % 100000;
    return new OrdersApiSupport.AddressPayload(
      "API Billing " + suffix,
      suffix + " Test Street",
      "Boston",
      "MA",
      "02135",
      "United States",
      "617555" + String.format("%04d", suffix % 10000)
    );
  }

  private Map<String, Object> findCreatedOrder(List<Map<String, Object>> orders) {
    return orders
      .stream()
      .filter((order) -> OrdersApiContext.fixture().invoiceNumber().equals(order.get("invoiceNumber")))
      .findFirst()
      .orElseThrow(() -> new AssertionError("Expected the created order to be returned by /api/profile/orders"));
  }

  private void assertCurrencyEquals(double actual, BigDecimal expected) {
    Assert.assertEquals(
      BigDecimal.valueOf(actual).setScale(2, RoundingMode.HALF_UP),
      expected.setScale(2, RoundingMode.HALF_UP)
    );
  }

  private void assertCartResponseMatchesFixture(Response response) {
    response.then().statusCode(200);
    Assert.assertEquals(response.jsonPath().getInt("items.size()"), 1);
    Assert.assertEquals(response.jsonPath().getString("items[0].id"), OrdersApiContext.checkoutFixture().variant().cartItemId());
    Assert.assertEquals(response.jsonPath().getInt("items[0].qty"), OrdersApiContext.checkoutFixture().variant().quantity());
    Assert.assertEquals(response.jsonPath().getInt("shippingAddressId"), OrdersApiContext.checkoutFixture().shippingAddressId());
    Assert.assertEquals(response.jsonPath().getInt("billingAddressId"), OrdersApiContext.checkoutFixture().billingAddressId());
    Assert.assertEquals(response.jsonPath().getInt("shippingId"), OrdersApiContext.checkoutFixture().shipping().id());
  }

  private void assertPdfResponse(Response response, String expectedFilePrefix) {
    response.then().statusCode(200);
    Assert.assertTrue(
      response.contentType().toLowerCase().contains(PDF_CONTENT_TYPE),
      "Expected a PDF response but received " + response.contentType()
    );
    Assert.assertTrue(
      response.header("Content-Disposition") != null &&
      response.header("Content-Disposition").contains(expectedFilePrefix),
      "Expected Content-Disposition to contain " + expectedFilePrefix
    );
    Assert.assertTrue(response.asByteArray().length > 0, "Expected non-empty PDF bytes");
  }

  @Given("I am authenticated for the orders API")
  public void iAmAuthenticatedForTheOrdersApi() {
    OrdersApiContext.setAuthCookies(OrdersApiSupport.authenticate());
  }

  @Given("a verified disposable account exists for account deletion")
  public void aVerifiedDisposableAccountExistsForAccountDeletion() throws Exception {
    OrdersApiContext.setDisposableAccount(OrdersApiSupport.createVerifiedDisposableAccount());
  }

  @Given("I am authenticated as the disposable account")
  public void iAmAuthenticatedAsTheDisposableAccount() {
    OrdersApiSupport.DisposableAccount account = OrdersApiContext.disposableAccount();
    Assert.assertNotNull(account, "Disposable account should have been created first");
    OrdersApiContext.setAuthCookies(OrdersApiSupport.authenticate(account.email(), account.password()));
  }

  @Given("I remember the current default measurement")
  public void iRememberTheCurrentDefaultMeasurement() throws Exception {
    OrdersApiContext.setOriginalMeasurement(OrdersApiSupport.loadMeasurementSnapshot());
  }

  @Given("a checkout fixture is available")
  public void aCheckoutFixtureIsAvailable() throws Exception {
    OrdersApiContext.setCheckoutFixture(OrdersApiSupport.loadCheckoutFixture());
  }

  @Given("an order exists for the current user")
  public void anOrderExistsForTheCurrentUser() throws Exception {
    OrdersApiContext.setFixture(OrdersApiSupport.insertOrderFixture());
    OrdersApiContext.setRetrievedOrderId(OrdersApiContext.fixture().orderId());
  }

  @When("I retrieve the current profile")
  public void iRetrieveTheCurrentProfile() {
    OrdersApiContext.setProfileResponse(OrdersApiSupport.retrieveProfile(OrdersApiContext.authCookies()));
  }

  @Then("the profile response should include the current user")
  public void theProfileResponseShouldIncludeTheCurrentUser() {
    Response response = OrdersApiContext.profileResponse();
    response.then().statusCode(200);
    Assert.assertNotNull(response.jsonPath().getMap("user"));
    Assert.assertEquals(response.jsonPath().getString("user.email").toLowerCase(), TestConfig.testUserEmail().toLowerCase());
  }

  @When("I delete the current account without authentication")
  public void iDeleteTheCurrentAccountWithoutAuthentication() {
    OrdersApiContext.setAccountDeleteResponse(
      OrdersApiSupport.deleteCurrentAccountWithoutAuthentication("StrongPass123A")
    );
  }

  @When("I delete the current account with the wrong password")
  public void iDeleteTheCurrentAccountWithTheWrongPassword() {
    OrdersApiContext.setAccountDeleteResponse(
      OrdersApiSupport.deleteCurrentAccount(OrdersApiContext.authCookies(), "WrongPassword123A")
    );
  }

  @When("I delete the current account with the correct password")
  public void iDeleteTheCurrentAccountWithTheCorrectPassword() {
    OrdersApiSupport.DisposableAccount account = OrdersApiContext.disposableAccount();
    Assert.assertNotNull(account, "Disposable account should have been created first");
    OrdersApiContext.setAccountDeleteResponse(
      OrdersApiSupport.deleteCurrentAccount(OrdersApiContext.authCookies(), account.password())
    );
  }

  @Then("the account delete response should be unauthorized")
  public void theAccountDeleteResponseShouldBeUnauthorized() {
    OrdersApiContext.accountDeleteResponse().then().statusCode(401);
  }

  @Then("the account delete response should reject password confirmation")
  public void theAccountDeleteResponseShouldRejectPasswordConfirmation() {
    OrdersApiContext.accountDeleteResponse().then().statusCode(403);
  }

  @Then("the account delete response should be successful")
  public void theAccountDeleteResponseShouldBeSuccessful() {
    OrdersApiContext.accountDeleteResponse().then().statusCode(200);
    Assert.assertEquals(OrdersApiContext.accountDeleteResponse().jsonPath().getString("message"), "Account deleted.");
  }

  @Then("the disposable account should no longer be able to log in")
  public void theDisposableAccountShouldNoLongerBeAbleToLogIn() {
    OrdersApiSupport.DisposableAccount account = OrdersApiContext.disposableAccount();
    Assert.assertNotNull(account, "Disposable account should have been created first");

    Response response = OrdersApiSupport.loginThroughBackend(account.email(), account.password());
    Assert.assertTrue(
      response.statusCode() == 401 || response.statusCode() == 403,
      "Expected deleted account login to fail, got status " + response.statusCode() + " with body " + response.asString()
    );
  }

  @When("I save a new default measurement")
  public void iSaveANewDefaultMeasurement() {
    OrdersApiSupport.MeasurementSnapshot nextMeasurement = nextMeasurementSnapshot(OrdersApiContext.originalMeasurement());
    OrdersApiContext.setTargetMeasurement(nextMeasurement);
    OrdersApiContext.setProfileResponse(
      OrdersApiSupport.saveMeasurement(OrdersApiContext.authCookies(), nextMeasurement)
    );
  }

  @Then("the profile response should include the saved measurement")
  public void theProfileResponseShouldIncludeTheSavedMeasurement() {
    Response response = OrdersApiContext.profileResponse();
    response.then().statusCode(200);
    assertCurrencyEquals(response.jsonPath().getDouble("measurement.heightCm"), OrdersApiContext.targetMeasurement().heightCm());
    assertCurrencyEquals(response.jsonPath().getDouble("measurement.chestCm"), OrdersApiContext.targetMeasurement().chestCm());
    assertCurrencyEquals(response.jsonPath().getDouble("measurement.sleeveLengthCm"), OrdersApiContext.targetMeasurement().sleeveLengthCm());
  }

  @When("I copy the default shipping address to billing")
  public void iCopyTheDefaultShippingAddressToBilling() {
    OrdersApiContext.setProfileResponse(
      OrdersApiSupport.copyDefaultShippingAddressToBilling(OrdersApiContext.authCookies())
    );
  }

  @Then("the profile response should include at least one billing address")
  public void theProfileResponseShouldIncludeAtLeastOneBillingAddress() {
    Response response = OrdersApiContext.profileResponse();
    response.then().statusCode(200);
    Assert.assertTrue(
      response.jsonPath().getList("billingAddresses").size() >= 1,
      "Expected at least one billing address in the profile response"
    );
  }

  @When("I save a new billing address")
  public void iSaveANewBillingAddress() {
    OrdersApiSupport.AddressPayload address = nextBillingAddress();
    OrdersApiContext.setTargetAddress(address);
    Response response = OrdersApiSupport.saveAddress(OrdersApiContext.authCookies(), "billing", address);
    OrdersApiContext.setProfileResponse(response);

    List<Map<String, Object>> billingAddresses = response.jsonPath().getList("billingAddresses");
    Map<String, Object> insertedAddress = billingAddresses
      .stream()
      .filter((entry) -> address.street().equals(entry.get("street")))
      .findFirst()
      .orElseThrow(() -> new AssertionError("Expected the new billing address to be returned"));
    OrdersApiContext.setTargetAddressId(((Number) insertedAddress.get("id")).intValue());
  }

  @Then("the profile response should include the new billing address")
  public void theProfileResponseShouldIncludeTheNewBillingAddress() {
    Response response = OrdersApiContext.profileResponse();
    response.then().statusCode(200);
    Assert.assertEquals(response.jsonPath().getInt("billingAddresses.size()") >= 1, true);

    List<Map<String, Object>> billingAddresses = response.jsonPath().getList("billingAddresses");
    Map<String, Object> insertedAddress = billingAddresses
      .stream()
      .filter((entry) -> ((Number) entry.get("id")).intValue() == OrdersApiContext.targetAddressId())
      .findFirst()
      .orElseThrow(() -> new AssertionError("Expected to find the created billing address in the response"));

    Assert.assertEquals(insertedAddress.get("name"), OrdersApiContext.targetAddress().name());
    Assert.assertEquals(insertedAddress.get("street"), OrdersApiContext.targetAddress().street());
    Assert.assertEquals(insertedAddress.get("city"), OrdersApiContext.targetAddress().city());
    Assert.assertEquals(insertedAddress.get("state"), OrdersApiContext.targetAddress().state());
    Assert.assertEquals(insertedAddress.get("zipCode"), OrdersApiContext.targetAddress().zipCode());
    Assert.assertEquals(insertedAddress.get("country"), OrdersApiContext.targetAddress().country());
    Assert.assertEquals(insertedAddress.get("phone"), OrdersApiContext.targetAddress().phone());
  }

  @When("I delete the new billing address")
  public void iDeleteTheNewBillingAddress() {
    OrdersApiContext.setProfileResponse(
      OrdersApiSupport.deleteAddress(OrdersApiContext.authCookies(), OrdersApiContext.targetAddressId())
    );
  }

  @Then("the profile response should no longer include the deleted billing address")
  public void theProfileResponseShouldNoLongerIncludeTheDeletedBillingAddress() {
    Response response = OrdersApiContext.profileResponse();
    response.then().statusCode(200);

    List<Map<String, Object>> billingAddresses = response.jsonPath().getList("billingAddresses");
    boolean stillPresent = billingAddresses
      .stream()
      .anyMatch((entry) -> ((Number) entry.get("id")).intValue() == OrdersApiContext.targetAddressId());
    Assert.assertFalse(stillPresent, "Expected the deleted billing address to be absent from the response");
    OrdersApiContext.setTargetAddressId(null);
  }

  @When("I save the current cart selections and items")
  public void iSaveTheCurrentCartSelectionsAndItems() {
    OrdersApiContext.setCartResponse(
      OrdersApiSupport.saveCart(OrdersApiContext.authCookies(), OrdersApiContext.checkoutFixture())
    );
  }

  @When("I retrieve the current cart")
  public void iRetrieveTheCurrentCart() {
    OrdersApiContext.setCartResponse(OrdersApiSupport.retrieveCart(OrdersApiContext.authCookies()));
  }

  @Then("the cart response should include the persisted items and selections")
  public void theCartResponseShouldIncludeThePersistedItemsAndSelections() {
    assertCartResponseMatchesFixture(OrdersApiContext.cartResponse());
  }

  @When("I clear the current cart")
  public void iClearTheCurrentCart() {
    OrdersApiContext.setCartResponse(OrdersApiSupport.clearCart(OrdersApiContext.authCookies()));
  }

  @Then("the cart response should be empty")
  public void theCartResponseShouldBeEmpty() {
    Response response = OrdersApiContext.cartResponse();
    response.then().statusCode(200);
    Assert.assertEquals(response.jsonPath().getInt("items.size()"), 0);
  }

  @When("I submit a mock payment for the current cart")
  public void iSubmitAMockPaymentForTheCurrentCart() {
    OrdersApiContext.setMockPaymentResponse(
      OrdersApiSupport.submitMockPayment(OrdersApiContext.authCookies(), OrdersApiContext.checkoutFixture())
    );
  }

  @Then("the mock payment response should create a paid order")
  public void theMockPaymentResponseShouldCreateAPaidOrder() {
    Response response = OrdersApiContext.mockPaymentResponse();
    response.then().statusCode(200);

    long orderId = response.jsonPath().getLong("orderId");
    String invoiceNumber = response.jsonPath().getString("invoiceNumber");
    Assert.assertTrue(orderId > 0, "Expected a generated order id");
    Assert.assertTrue(invoiceNumber != null && !invoiceNumber.isBlank(), "Expected an invoice number");
    Assert.assertNotNull(response.jsonPath().getString("paidAt"));

    OrdersApiContext.setRetrievedOrderId(orderId);
    OrdersApiContext.setFixture(
      OrdersApiSupport.createOrderFixtureFromMockPayment(
        OrdersApiContext.checkoutFixture(),
        orderId,
        invoiceNumber
      )
    );
  }

  @When("I retrieve all orders for the current user")
  public void iRetrieveAllOrdersForTheCurrentUser() {
    OrdersApiContext.setAllOrdersResponse(
      OrdersApiSupport.retrieveAllOrders(OrdersApiContext.authCookies())
    );
  }

  @Then("the orders response should include the created order")
  public void theOrdersResponseShouldIncludeTheCreatedOrder() {
    Response response = OrdersApiContext.allOrdersResponse();
    response.then().statusCode(200);

    List<Map<String, Object>> orders = response.jsonPath().getList("$");
    Assert.assertNotNull(orders, "Orders payload should be a list");

    Map<String, Object> insertedOrder = findCreatedOrder(orders);
    long retrievedOrderId = ((Number) insertedOrder.get("id")).longValue();
    OrdersApiContext.setRetrievedOrderId(retrievedOrderId);

    Assert.assertEquals(retrievedOrderId, OrdersApiContext.fixture().orderId());
    Assert.assertEquals(insertedOrder.get("paymentStatus"), "paid");
    Assert.assertEquals(insertedOrder.get("shipmentStatus"), "unshipped");
  }

  @When("I retrieve that single order")
  public void iRetrieveThatSingleOrder() {
    OrdersApiContext.setSingleOrderResponse(
      OrdersApiSupport.retrieveSingleOrder(
        OrdersApiContext.authCookies(),
        OrdersApiContext.retrievedOrderId()
      )
    );
  }

  @Then("the single order response should match the created order")
  public void theSingleOrderResponseShouldMatchTheCreatedOrder() {
    Response response = OrdersApiContext.singleOrderResponse();
    response.then().statusCode(200);

    Assert.assertEquals(response.jsonPath().getLong("id"), OrdersApiContext.fixture().orderId());
    Assert.assertEquals(response.jsonPath().getString("invoiceNumber"), OrdersApiContext.fixture().invoiceNumber());
    Assert.assertEquals(response.jsonPath().getString("paymentStatus"), "paid");
    Assert.assertEquals(response.jsonPath().getString("shipmentStatus"), "unshipped");
    Assert.assertEquals(response.jsonPath().getString("shipping.mode"), OrdersApiContext.fixture().shippingMode());
    Assert.assertEquals(response.jsonPath().getInt("items.size()"), 1);
    Assert.assertEquals(response.jsonPath().getInt("items[0].productId"), OrdersApiContext.fixture().productId());
    Assert.assertEquals(response.jsonPath().getInt("items[0].variantId"), OrdersApiContext.fixture().variantId());
    Assert.assertEquals(response.jsonPath().getInt("items[0].quantity"), OrdersApiContext.fixture().quantity());
    assertCurrencyEquals(response.jsonPath().getDouble("items[0].unitPriceUsd"), OrdersApiContext.fixture().unitPriceUsd());
    Assert.assertEquals(response.jsonPath().getString("items[0].productName"), OrdersApiContext.fixture().productName());
    Assert.assertEquals(response.jsonPath().getString("items[0].color"), OrdersApiContext.fixture().color());
    Assert.assertEquals(response.jsonPath().getString("items[0].size"), OrdersApiContext.fixture().size());
    Assert.assertEquals(response.jsonPath().getBoolean("items[0].variantExists"), true);
  }

  @When("I retrieve the invoice payload for that order")
  public void iRetrieveTheInvoicePayloadForThatOrder() {
    OrdersApiContext.setInvoicePayloadResponse(
      OrdersApiSupport.retrieveInvoicePayload(
        OrdersApiContext.authCookies(),
        OrdersApiContext.fixture().orderId()
      )
    );
  }

  @Then("the invoice payload response should include the complete order information")
  public void theInvoicePayloadResponseShouldIncludeTheCompleteOrderInformation() {
    Response response = OrdersApiContext.invoicePayloadResponse();
    response.then().statusCode(200);

    Assert.assertEquals(response.jsonPath().getString("invoiceNumber"), OrdersApiContext.fixture().invoiceNumber());
    Assert.assertNotNull(response.jsonPath().getString("paidAt"));
    Assert.assertEquals(response.jsonPath().getString("customerEmail"), OrdersApiContext.fixture().customerEmail());

    String expectedShippingModeLabel = formatShippingMode(OrdersApiContext.fixture().shippingMode());
    if (OrdersApiContext.fixture().shippingDeliveryTime() != null && !OrdersApiContext.fixture().shippingDeliveryTime().isBlank()) {
      expectedShippingModeLabel += " " + OrdersApiContext.fixture().shippingDeliveryTime();
    }
    Assert.assertEquals(response.jsonPath().getString("shippingModeLabel"), expectedShippingModeLabel);

    Assert.assertTrue(response.jsonPath().getDouble("subtotalUsd") > 0);
    Assert.assertTrue(response.jsonPath().getDouble("shippingUsd") >= 0);
    Assert.assertTrue(response.jsonPath().getDouble("totalUsd") > 0);

    Assert.assertNotNull(response.jsonPath().getString("shippingAddress.name"));
    Assert.assertNotNull(response.jsonPath().getString("shippingAddress.street"));
    Assert.assertNotNull(response.jsonPath().getString("shippingAddress.city"));
    Assert.assertNotNull(response.jsonPath().getString("shippingAddress.state"));
    Assert.assertNotNull(response.jsonPath().getString("shippingAddress.zipCode"));
    Assert.assertNotNull(response.jsonPath().getString("shippingAddress.country"));
    Assert.assertNotNull(response.jsonPath().getString("shippingAddress.phone"));

    Assert.assertNotNull(response.jsonPath().getString("billingAddress.name"));
    Assert.assertNotNull(response.jsonPath().getString("billingAddress.street"));
    Assert.assertNotNull(response.jsonPath().getString("billingAddress.city"));
    Assert.assertNotNull(response.jsonPath().getString("billingAddress.state"));
    Assert.assertNotNull(response.jsonPath().getString("billingAddress.zipCode"));
    Assert.assertNotNull(response.jsonPath().getString("billingAddress.country"));
    Assert.assertNotNull(response.jsonPath().getString("billingAddress.phone"));

    Assert.assertEquals(response.jsonPath().getInt("items.size()"), 1);
    Assert.assertEquals(response.jsonPath().getString("items[0].name"), OrdersApiContext.fixture().productName());
    Assert.assertEquals(response.jsonPath().getString("items[0].color"), OrdersApiContext.fixture().color());
    Assert.assertEquals(response.jsonPath().getString("items[0].size"), OrdersApiContext.fixture().size());
    Assert.assertEquals(response.jsonPath().getInt("items[0].quantity"), OrdersApiContext.fixture().quantity());
    assertCurrencyEquals(response.jsonPath().getDouble("items[0].unitPriceUsd"), OrdersApiContext.fixture().unitPriceUsd());
  }

  @When("I retrieve the invoice PDF for that order")
  public void iRetrieveTheInvoicePdfForThatOrder() {
    OrdersApiContext.setOrderInvoicePdfResponse(
      OrdersApiSupport.retrieveInvoicePdf(
        OrdersApiContext.authCookies(),
        OrdersApiContext.fixture().orderId()
      )
    );
  }

  @Then("the order invoice PDF response should be a downloadable PDF")
  public void theOrderInvoicePdfResponseShouldBeADownloadablePdf() {
    assertPdfResponse(OrdersApiContext.orderInvoicePdfResponse(), "invoice-");
  }

  @When("I generate a direct invoice PDF from the invoice payload")
  public void iGenerateADirectInvoicePdfFromTheInvoicePayload() {
    OrdersApiContext.setGeneratedInvoicePdfResponse(
      OrdersApiSupport.generateInvoicePdf(
        OrdersApiContext.authCookies(),
        OrdersApiContext.invoicePayloadResponse()
      )
    );
  }

  @Then("the direct invoice PDF response should be a downloadable PDF")
  public void theDirectInvoicePdfResponseShouldBeADownloadablePdf() {
    assertPdfResponse(OrdersApiContext.generatedInvoicePdfResponse(), "invoice-");
  }
}
