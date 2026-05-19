@CheckoutApi@Regression
Feature: Checkout API

  Scenario: Authenticated user can submit mock payment and retrieve invoice PDFs
    Given I am authenticated for the orders API
    And a checkout fixture is available
    And I save the current cart selections and items
    When I submit a mock payment for the current cart
    Then the mock payment response should create a paid order
    When I retrieve all orders for the current user
    Then the orders response should include the created order
    When I retrieve that single order
    Then the single order response should match the created order
    When I retrieve the invoice payload for that order
    Then the invoice payload response should include the complete order information
    When I retrieve the invoice PDF for that order
    Then the order invoice PDF response should be a downloadable PDF
    When I generate a direct invoice PDF from the invoice payload
    Then the direct invoice PDF response should be a downloadable PDF
