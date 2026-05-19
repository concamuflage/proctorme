@OrdersInvoiceApi@Regression
Feature: Orders invoice API

  Scenario: Authenticated user can retrieve invoice-ready data for an order
    Given I am authenticated for the orders API
    And an order exists for the current user
    When I retrieve the invoice payload for that order
    Then the invoice payload response should include the complete order information
