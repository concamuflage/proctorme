@ProfileApi@Regression
Feature: Profile API

  # Scenario: Authenticated user can retrieve and update profile information
  #   Given I am authenticated for the orders API
  #   And I remember the current default measurement
  #   And a checkout fixture is available
  #   When I retrieve the current profile
  #   Then the profile response should include the current user
  #   When I save a new default measurement
  #   Then the profile response should include the saved measurement
  #   When I copy the default shipping address to billing
  #   Then the profile response should include at least one billing address
  #   When I save a new billing address
  #   Then the profile response should include the new billing address
  #   When I delete the new billing address
  #   Then the profile response should no longer include the deleted billing address

  Scenario: Account deletion requires authentication and password confirmation
    When I delete the current account without authentication
    Then the account delete response should be unauthorized
    Given a verified disposable account exists for account deletion
    And I am authenticated as the disposable account
    When I delete the current account with the wrong password
    Then the account delete response should reject password confirmation
    When I delete the current account with the correct password
    Then the account delete response should be successful
    And the disposable account should no longer be able to log in
