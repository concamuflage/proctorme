@StripeWebhookApi@Regression
Feature: Stripe webhook API

  Scenario: A paid Stripe Checkout session is fulfilled by webhook and becomes invoice-ready
    Given I am authenticated for the orders API
    And a checkout fixture is available
    And I save the current cart selections and items
    And a Stripe checkout session exists for the current cart
    When Stripe sends a checkout.session.completed webhook for that session with payment status paid
    Then the webhook response should be accepted
    And the webhook event should be recorded
    And the payment record should be stored as paid
    And the Stripe checkout session should be linked to a created order
    When I retrieve that single order
    Then the single order response should match the webhook-created order
    When I retrieve the invoice payload for that order
    Then the invoice payload response should include the complete order information
    When I retrieve the invoice PDF for that order
    Then the order invoice PDF response should be a downloadable PDF

  Scenario: A failed Stripe payment is recorded without creating an order
    Given I am authenticated for the orders API
    And a checkout fixture is available
    And I save the current cart selections and items
    And a Stripe checkout session exists for the current cart
    When Stripe sends a payment_intent.payment_failed webhook for that session
    Then the webhook response should be accepted
    And the webhook event should be recorded
    And the payment record should be stored as failed
    And no order should be created for that Stripe checkout session

  Scenario: Duplicate Stripe webhook delivery does not create duplicate orders
    Given I am authenticated for the orders API
    And a checkout fixture is available
    And I save the current cart selections and items
    And a Stripe checkout session exists for the current cart
    When Stripe sends the same checkout.session.completed webhook twice for a paid session
    Then each webhook response should be accepted
    And the webhook event should be stored only once
    And only one order should exist for that Stripe checkout session
    And the payment record should still be stored as paid
