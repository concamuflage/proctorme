@CartApi@Regression
Feature: Cart API

  Scenario: Authenticated user can persist and retrieve the current cart
    Given I am authenticated for the orders API
    And a checkout fixture is available
    When I save the current cart selections and items
    Then the cart response should include the persisted items and selections
    When I retrieve the current cart
    Then the cart response should include the persisted items and selections
    When I clear the current cart
    Then the cart response should be empty
