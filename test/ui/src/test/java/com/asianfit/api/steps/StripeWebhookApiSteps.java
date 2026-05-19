package com.asianfit.api.steps;

import com.asianfit.api.support.OrdersApiContext;
import com.asianfit.api.support.OrdersApiSupport;
import io.cucumber.java.en.Given;
import io.cucumber.java.en.Then;
import io.cucumber.java.en.When;
import java.sql.SQLException;
import java.time.Instant;
import org.testng.Assert;

public class StripeWebhookApiSteps {
  private final OrdersApiSteps ordersApiSteps = new OrdersApiSteps();

  private String newCheckoutSessionId() {
    return "cs_test_api_" + Instant.now().toEpochMilli();
  }

  private String newPaymentIntentId() {
    return "pi_test_api_" + Instant.now().toEpochMilli();
  }

  private String newEventId() {
    return "evt_test_api_" + Instant.now().toEpochMilli();
  }

  private String paidCheckoutCompletedEventJson(String eventId, String sessionId, String paymentIntentId) {
    return """
      {
        "id": "%s",
        "object": "event",
        "type": "checkout.session.completed",
        "data": {
          "object": {
            "id": "%s",
            "object": "checkout.session",
            "payment_status": "paid",
            "status": "complete",
            "amount_total": %d,
            "currency": "usd",
            "customer_email": "%s",
            "customer_details": {
              "email": "%s"
            },
            "payment_intent": {
              "id": "%s",
              "object": "payment_intent",
              "amount": %d,
              "amount_received": %d,
              "currency": "usd",
              "customer": null,
              "latest_charge": null,
              "created": %d,
              "metadata": {
                "checkout_session_id": "%s",
                "userId": "%d"
              }
            },
            "created": %d,
            "metadata": {
              "userId": "%d"
            }
          }
        }
      }
      """
      .formatted(
        eventId,
        sessionId,
        totalAmountCents(),
        OrdersApiContext.checkoutFixture().customerEmail(),
        OrdersApiContext.checkoutFixture().customerEmail(),
        paymentIntentId,
        totalAmountCents(),
        totalAmountCents(),
        Instant.now().getEpochSecond(),
        sessionId,
        OrdersApiContext.checkoutFixture().userId(),
        Instant.now().getEpochSecond(),
        OrdersApiContext.checkoutFixture().userId()
      );
  }

  private String paymentFailedEventJson(String eventId, String sessionId, String paymentIntentId) {
    return """
      {
        "id": "%s",
        "object": "event",
        "type": "payment_intent.payment_failed",
        "data": {
          "object": {
            "id": "%s",
            "object": "payment_intent",
            "amount": %d,
            "currency": "usd",
            "customer": null,
            "latest_charge": null,
            "receipt_email": "%s",
            "metadata": {
              "checkout_session_id": "%s",
              "userId": "%d"
            },
            "last_payment_error": {
              "code": "card_declined",
              "message": "Your card was declined."
            }
          }
        }
      }
      """
      .formatted(
        eventId,
        paymentIntentId,
        totalAmountCents(),
        OrdersApiContext.checkoutFixture().customerEmail(),
        sessionId,
        OrdersApiContext.checkoutFixture().userId()
      );
  }

  private int totalAmountCents() {
    return OrdersApiContext
      .checkoutFixture()
      .variant()
      .subtotalUsd()
      .add(
        OrdersApiContext
          .checkoutFixture()
          .shipping()
          .shippingUsd(OrdersApiContext.checkoutFixture().variant().clothesWeightKg())
      )
      .movePointRight(2)
      .intValueExact();
  }

  @Given("a Stripe checkout session exists for the current cart")
  public void aStripeCheckoutSessionExistsForTheCurrentCart() throws SQLException {
    String stripeSessionId = newCheckoutSessionId();
    OrdersApiSupport.createStripeCheckoutSessionFixture(stripeSessionId, OrdersApiContext.checkoutFixture());
    OrdersApiContext.setStripeCheckoutSessionId(stripeSessionId);
  }

  @When("Stripe sends a checkout.session.completed webhook for that session with payment status paid")
  public void stripeSendsACheckoutSessionCompletedWebhookForThatSessionWithPaymentStatusPaid() {
    String paymentIntentId = newPaymentIntentId();
    String eventId = newEventId();
    OrdersApiContext.setStripePaymentIntentId(paymentIntentId);
    OrdersApiContext.setStripeWebhookEventId(eventId);
    OrdersApiContext.setStripeWebhookResponse(
      OrdersApiSupport.postSignedStripeWebhook(
        paidCheckoutCompletedEventJson(eventId, OrdersApiContext.stripeCheckoutSessionId(), paymentIntentId)
      )
    );
  }

  @When("Stripe sends a payment_intent.payment_failed webhook for that session")
  public void stripeSendsAPaymentIntentPaymentFailedWebhookForThatSession() {
    String paymentIntentId = newPaymentIntentId();
    String eventId = newEventId();
    OrdersApiContext.setStripePaymentIntentId(paymentIntentId);
    OrdersApiContext.setStripeWebhookEventId(eventId);
    OrdersApiContext.setStripeWebhookResponse(
      OrdersApiSupport.postSignedStripeWebhook(
        paymentFailedEventJson(eventId, OrdersApiContext.stripeCheckoutSessionId(), paymentIntentId)
      )
    );
  }

  @When("Stripe sends the same checkout.session.completed webhook twice for a paid session")
  public void stripeSendsTheSameCheckoutSessionCompletedWebhookTwiceForAPaidSession() {
    String paymentIntentId = newPaymentIntentId();
    String eventId = newEventId();
    String payload = paidCheckoutCompletedEventJson(eventId, OrdersApiContext.stripeCheckoutSessionId(), paymentIntentId);
    OrdersApiContext.setStripePaymentIntentId(paymentIntentId);
    OrdersApiContext.setStripeWebhookEventId(eventId);
    OrdersApiContext.setStripeDuplicateWebhookEventId(eventId);
    OrdersApiContext.setStripeWebhookResponse(OrdersApiSupport.postSignedStripeWebhook(payload));
    OrdersApiContext.setStripeSecondWebhookResponse(OrdersApiSupport.postSignedStripeWebhook(payload));
  }

  @Then("the webhook response should be accepted")
  public void theWebhookResponseShouldBeAccepted() {
    OrdersApiContext.stripeWebhookResponse().then().statusCode(200);
  }

  @Then("each webhook response should be accepted")
  public void eachWebhookResponseShouldBeAccepted() {
    OrdersApiContext.stripeWebhookResponse().then().statusCode(200);
    OrdersApiContext.stripeSecondWebhookResponse().then().statusCode(200);
  }

  @Then("the webhook event should be recorded")
  public void theWebhookEventShouldBeRecorded() throws SQLException {
    Assert.assertEquals(OrdersApiSupport.countStripeWebhookEvents(OrdersApiContext.stripeWebhookEventId()), 1);
    Assert.assertTrue(OrdersApiSupport.stripeWebhookEventProcessed(OrdersApiContext.stripeWebhookEventId()));
  }

  @Then("the webhook event should be stored only once")
  public void theWebhookEventShouldBeStoredOnlyOnce() throws SQLException {
    Assert.assertEquals(OrdersApiSupport.countStripeWebhookEvents(OrdersApiContext.stripeWebhookEventId()), 1);
  }

  @Then("the payment record should be stored as paid")
  public void thePaymentRecordShouldBeStoredAsPaid() throws SQLException {
    Assert.assertEquals(OrdersApiSupport.getStripePaymentStatus(OrdersApiContext.stripePaymentIntentId()), "paid");
  }

  @Then("the payment record should still be stored as paid")
  public void thePaymentRecordShouldStillBeStoredAsPaid() throws SQLException {
    thePaymentRecordShouldBeStoredAsPaid();
  }

  @Then("the payment record should be stored as failed")
  public void thePaymentRecordShouldBeStoredAsFailed() throws SQLException {
    Assert.assertEquals(OrdersApiSupport.getStripePaymentStatus(OrdersApiContext.stripePaymentIntentId()), "failed");
  }

  @Then("the Stripe checkout session should be linked to a created order")
  public void theStripeCheckoutSessionShouldBeLinkedToACreatedOrder() throws SQLException {
    Long orderId = OrdersApiSupport.findOrderIdForStripeCheckoutSession(OrdersApiContext.stripeCheckoutSessionId());
    Assert.assertNotNull(orderId, "Expected the webhook to link the Stripe checkout session to an order");

    String invoiceNumber = OrdersApiSupport.getOrderInvoiceNumber(orderId);
    Assert.assertTrue(invoiceNumber != null && !invoiceNumber.isBlank(), "Expected an invoice number on the created order");

    OrdersApiContext.setRetrievedOrderId(orderId);
    OrdersApiContext.setFixture(
      OrdersApiSupport.createOrderFixtureFromMockPayment(
        OrdersApiContext.checkoutFixture(),
        orderId,
        invoiceNumber
      )
    );
  }

  @Then("the single order response should match the webhook-created order")
  public void theSingleOrderResponseShouldMatchTheWebhookCreatedOrder() {
    ordersApiSteps.theSingleOrderResponseShouldMatchTheCreatedOrder();
  }

  @Then("no order should be created for that Stripe checkout session")
  public void noOrderShouldBeCreatedForThatStripeCheckoutSession() throws SQLException {
    Assert.assertNull(OrdersApiSupport.findOrderIdForStripeCheckoutSession(OrdersApiContext.stripeCheckoutSessionId()));
    Assert.assertEquals(OrdersApiSupport.countOrdersForStripeCheckoutSession(OrdersApiContext.stripeCheckoutSessionId()), 0);
  }

  @Then("only one order should exist for that Stripe checkout session")
  public void onlyOneOrderShouldExistForThatStripeCheckoutSession() throws SQLException {
    Assert.assertEquals(OrdersApiSupport.countOrdersForStripeCheckoutSession(OrdersApiContext.stripeCheckoutSessionId()), 1);
  }
}
