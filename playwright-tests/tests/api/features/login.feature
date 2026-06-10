Feature: Login API

  Scenario: A verified user can log in
    Given I have a verified API user
    When I submit the login API request
    Then the login API responds with the signed-in account

  Scenario: An unverified user cannot log in
    Given I have an unverified API user
    When I submit the login API request
    Then the login API requires email verification

  Scenario: Login rejects an incorrect password
    Given I have a verified API user
    When I submit the login API request with an incorrect password
    Then the login API rejects the credentials
