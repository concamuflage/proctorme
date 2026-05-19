@Cart@Regression
Feature: Cart

  

  Scenario: the carts should display the correct total weight and price

    Given I open the login page
    Then I should be on the login page
    When I sign in with the configured test account
    Then I should land on the products page
    When I click on the "Hoodies" filter
    And click on the first product
    And I add the product to the cart
    And I go to the products page
    And I click on the "Sweatshirts" filter
    And click on the first product
    And I add the product to the cart
    And I go to the cart page
    Then the cart should show the correct total weight and price of the products
    And the cart should show the correct total weight with carton box and shipping cost
    And the cart should show the correct total price with shipping cost

    When I choose the second shipping option
    Then the cart should show the correct total price with shipping cost
    
    When I increase the quantity of the first cart item
    And I increase the quantity of the second cart item
    Then the cart should show the correct total weight and price of the products
    And the cart should show the correct total weight with carton box and shipping cost
    And the cart should show the correct total price with shipping cost

   




  # Scenario: You must be logged in to access the cart page
  #   Given I open the protected cart page
  #   Then I should be on the login page
  #   When I sign in with the configured test account
  #   Then I should land on the cart page
