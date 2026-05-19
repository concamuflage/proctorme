@Modal@Regression
Feature: Auth modals

  Scenario: User can open the login modal, switch to signup, and close it
    Given I open the products page
    When I open the login modal
    Then the login modal should be visible
    When I switch to the signup modal
    Then the signup modal should be visible
    When I close the auth modal
    Then the auth modal should be closed
