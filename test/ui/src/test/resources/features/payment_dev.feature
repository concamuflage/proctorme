@Payment @Regression
Feature: Stripe payment
  # Testing Stripe payment in Test Mode

  Scenario: A new user can complete a successful card payment through Stripe Checkout
    Given I open the signup page
    Then I should be on the signup page
    When I sign up with a plus email based on "concamuflage@gmail.com" and password "StrongPass123A"
    Then the signup should be successful and ask the user to verify their email address
    And Wait 10 Seconds before login and look for verification email
    And I log into its email account through the API and find the verification email
    And the verification email sender should be correct
    And I click the link in the verification email
    Then the email verification should be successful
    Given I open the login page
    Then I should be on the login page
    When I login in with the generated plus email and password "StrongPass123A"
    Then the login should be successful and land on the products page
    When I click on the "Hoodies" filter
    And click on the first product
    And I add the product to the cart
    And I go to the cart page
    Then the cart should show the correct total weight and price of the products
    And the cart should show the correct total weight with carton box and shipping cost
    And the cart should show the correct total price with shipping cost
    When I click checkout
    And I click "Add shipping address" button
    And I enter shipping full name "UI Test User"
    And I enter shipping phone "2015550123"
    And I enter shipping street "123 Test Street"
    And I enter shipping city "Boston"
    And I select shipping state "MA"
    And I enter shipping ZIP code "02135"
    And I save the shipping address
    And I start Stripe Checkout payment
    Then I should be redirected to the Stripe Checkout page
    When I choose the Stripe Card payment option
    When I pay with the Stripe test card "4242 4242 4242 4242"
    And I enter the Stripe expiration date "12 / 34"
    And I enter the Stripe security code "123"
    And I enter the Stripe cardholder name "UI Test User"
    And I enter a generated Stripe email address
    And I enter the Stripe billing ZIP code "02135"
    And I enter the Stripe phone number "2015550123"
    And I submit the Stripe payment
    Then I should be redirected back to the checkout success page
    And I wait 10 seconds for the Stripe webhook to complete
    And I refresh the checkout success page
    And I should see the invoice download link
    And I should receive a payment confirmation email with the invoice attached
    And the invoice link should be correct

    
  # Scenario: A user sees a card error when Stripe declines the payment
  #   Given I open the login page
  #   Then I should be on the login page
  #   When I sign in with the configured test account
  #   Then I should land on the products page
  #   When I click on the "Hoodies" filter
  #   And click on the first product
  #   And I add the product to the cart
  #   And I go to the cart page
  #   And I click checkout
  #   Then I should see the essential order details
  #   When I start Stripe Checkout payment
  #   Then I should be redirected to the Stripe Checkout page
  #   When I pay with the Stripe test card "4000 0000 0000 0002"
  #   And I enter the Stripe expiration date "12 / 34"
  #   And I enter the Stripe security code "123"
  #   And I enter the Stripe cardholder name "UI Test User"
  #   And I submit the Stripe payment
  #   Then Stripe Checkout should show a declined card error
  #   And I should remain on the Stripe Checkout page
  # # Scenario: A user can cancel Stripe Checkout through Browser Back button and return to the cart review
  # #   Given I open the login page
  # #   Then I should be on the login page
  # #   When I sign in with the configured test account
  # #   Then I should land on the products page
  # #   When I click on the "Hoodies" filter
  # #   And click on the first product
  # #   And I add the product to the cart
  # #   And I go to the cart page
  # #   And I click checkout
  # #   Then I should see the essential order details
  # #   When I start Stripe Checkout payment
  # #   Then I should be redirected to the Stripe Checkout page
  # #   When I cancel Stripe Checkout through Browser's back button
  # #   Then I should be returned to the cart page
  # #   And the cart should still show the correct total price with shipping cost
  #   Scenario: A user can cancel Stripe Checkout through Back button on the Stripe Checkout page and return to the cart review
  #   Given I open the login page
  #   Then I should be on the login page
  #   When I sign in with the configured test account
  #   Then I should land on the products page
  #   When I click on the "Hoodies" filter
  #   And click on the first product
  #   And I add the product to the cart
  #   And I go to the cart page
  #   And I click checkout
  #   Then I should see the essential order details
  #   When I start Stripe Checkout payment
  #   Then I should be redirected to the Stripe Checkout page
  #   When I cancel Stripe Checkout through Back button on the Stripe Checkout page
  #   Then I should be returned to the cart page
  #   And the cart should still show the correct total price with shipping cost
