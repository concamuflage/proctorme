@Checkout@Regression
Feature: Checkout

  Scenario: A returning user can review checkout details with saved addresses
    Given I open the login page
    Then I should be on the login page
    When I sign in with a test account that already has shipping and billing addresses
    Then I should land on the products page
    When I click on the "Hoodies" filter
    And click on the first product
    And I add the product to the cart
    And I go to the cart page
    And I click checkout
    Then I should see the essential order details
    And I should see the saved shipping addresses
    And I should see the saved billing addresses
    And I should be able to choose another shipping address
    And I should be able to choose another billing address
    And I should be able to edit the selected shipping address
    And I should be able to edit the selected billing address

  Scenario: A new user can start checkout without saved addresses
    Given I open the login page
    Then I should be on the login page
    When I sign in with a new test account that has no saved addresses
    Then I should land on the products page
    When I click on the "Hoodies" filter
    And click on the first product
    And I add the product to the cart
    And I go to the cart page
    And I click checkout
    Then I should see the essential order details
    And I should see that no shipping address is saved yet
    And I should see that no billing address is saved yet
    And I should be prompted to add or choose shipping information
    And I should be asked whether the billing address is the same as the shipping address
    And I should be able to add a new shipping address during checkout
    And I should be able to add a separate billing address during checkout
