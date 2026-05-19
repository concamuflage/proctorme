@OrdersApi@Regression
Feature: Orders API

  Scenario: Authenticated user can retrieve all orders and a single order
    Given I am authenticated for the orders API
    And an order exists for the current user
    When I retrieve all orders for the current user
    Then the orders response should include the created order
    When I retrieve that single order
    Then the single order response should match the created order
