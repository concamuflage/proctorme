Feature: NextAuth credentials sign-in

  Scenario: A verified user can log in
    Given I have a verified API user
    When I submit the NextAuth credentials sign-in request
    Then the NextAuth session contains the signed-in account

  Scenario: An unverified user cannot log in
    Given I have an unverified API user
    When I submit the NextAuth credentials sign-in request
    Then the NextAuth credentials sign-in requires email verification

  Scenario: Login rejects an incorrect password
    Given I have a verified API user
    When I submit the NextAuth credentials sign-in request with an incorrect password
    Then the NextAuth credentials sign-in rejects the credentials
