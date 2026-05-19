@Signup @Regression @Smoke
Feature: Signup and Login
  # The cleanup step of deleting created user is in the hook.
  # After each scenario, the created user will be deleted through a direct database delete.

  Background:
    Given I open the signup page
    Then I should be on the signup page
  # Cleanup is handled by the @Signup after hook with a direct database delete
  # of the generated plus email for the scenario.

  Scenario: User cannot login without verifying their email address
    When I sign up with a plus email based on "concamuflage@gmail.com" and password "StrongPass123A"
    Then the signup should be successful and ask the user to verify their email address
    # correct but unverified account should not be able to log in
    Given I open the login page
    Then I should be on the login page
    When I login in with the generated plus email and password "StrongPass123A"
    Then the login should fail with an error message about email verification
    And Wait 10 Seconds before login and look for verification email
    And I log into its email account through the API and find the verification email
    And the verification email sender should be correct
    And I click the link in the verification email
    Then the email verification should be successful
    # login with wrong password
    Given I open the login page
    Then I should be on the login page
    And I login in with the generated plus email and password "StrongPass123B"
    Then the login should fail with an error message about incorrect password
    # login with correct password
    Given I open the login page
    Then I should be on the login page
    When I login in with the generated plus email and password "StrongPass123A"
    Then the login should be successful and land on the products page

  Scenario: User can request a new verification email if they haven't received the original one
    When I sign up with a plus email based on "concamuflage@gmail.com" and password "StrongPass123A"
    Then the signup should be successful and ask the user to verify their email address
    When I request a new verification email
    Then Wait 10 Seconds before login and look for verification email
    And I log into its email account through the API and find the verification email
    And the verification email sender should be correct
    And I click the link in the verification email
    Then the email verification should be successful
    # login with correct password
    Given I open the login page
    Then I should be on the login page
    When I login in with the generated plus email and password "StrongPass123A"
    Then the login should be successful and land on the products page

  Scenario: User cannot sign up twice with the same email address
    # register for the first time
    When I sign up with a plus email based on "concamuflage@gmail.com" and password "StrongPass123A"
    Then the signup should be successful and ask the user to verify their email address
    # register for the second time with the same generated plus email
    Given I open the signup page
    Then I should be on the signup page
    When I sign up with the same generated plus email and password "StrongPass123A"
    Then the signup page should show a validation error

  Scenario Outline: User cannot sign up with a password that violates the password policy
    # Minimum length: 12
    # Must include lowercase: [a-z]
    # Must include uppercase: [A-Z]
    # Must include a digit: \d
    # Must not contain whitespace: \s
    # Special characters are allowed but not required
    When I sign up with a generated account using password "<password>"
    Then the signup page should show the password requirements error

    Examples:
      | password      |
      | Short1!       |
      | lowercase123! |
      | UPPERCASE123! |
      | NoDigitsHere! |
      | Has Space123! |
      # Too short
      # Missing uppercase letter
      # Missing lowercase letter
      # Missing digit
      # Contains whitespace


