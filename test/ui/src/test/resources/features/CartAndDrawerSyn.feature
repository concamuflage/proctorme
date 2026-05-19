@CartAndDrawerSync@Regression
Feature: Cart and drawer stay in sync

  Scenario: changing the shipping option in the cart drawer updates the cart page
    Given I open the login page
    Then I should be on the login page
    When I sign in with the configured test account
    Then I should land on the products page
    When I click on the "Hoodies" filter
    And click on the first product
    And I add the product to the cart
    And I open the cart drawer
    And I choose the second shipping option in the cart drawer
    And I go to the cart page
    Then the cart page should show the second shipping option as selected
    And the cart page should display the same items and quantities as the cart drawer
    And the cart page should display the same shipping cost and total price as the cart drawer

  Scenario: changing the shipping option on the cart page updates the cart drawer
    Given I open the login page
    Then I should be on the login page
    When I sign in with the configured test account
    Then I should land on the products page
    When I click on the "Hoodies" filter
    And click on the first product
    And I add the product to the cart
    And I go to the cart page
    And I choose the second shipping option
    And I open the cart drawer
    Then the cart drawer should show the second shipping option as selected
    And the cart drawer should display the same items and quantities as the cart page
    And the cart drawer should display the same shipping cost and total price as the cart page

