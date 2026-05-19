@ResetPassword
Feature: Reset Password Feature

    Background:
    Given I open the signup page
    Then I should be on the signup page
    When I sign up with a plus email based on "concamuflage@gmail.com" and password "StrongPass123A"
    Then the signup should be successful and ask the user to verify their email address

#   Scenario: verified user can reset the password
    
#     And Wait 10 Seconds before login and look for verification email
#     And I log into its email account through the API and find the verification email
#     And the verification email sender should be correct
#     And I click the link in the verification email
#     Then the email verification should be successful
#     Given I open the login page
#     Then I should be on the login page
#     When I click on the "Forgot Password" link
#     And I enter my email address 
#     And submit the form
#     Then I should see a confirmation message that a password reset email has been sent
#     And I should receive a password reset email with instructions to reset my password
#     Then I click the link in the password reset email
#     And I should be taken to the password reset page
#     And I enter a new password "StrongPass123New" that meets the password policy
#     And I enter a new password "StrongPass123New" again to confirm
#     And I submit the new password
#     Given I open the login page
#     Then I should be on the login page
#     When I login in with the generated plus email and "StrongPass123New"
#     Then the login should be successful and land on the products page
  
  Scenario: unverified user can reset the password

    Given I open the login page
    Then I should be on the login page
    When I click on the "Forgot Password" link
    And I enter my email address 
    And submit the form
    Then I should see a confirmation message that a password reset email has been sent
    And I should receive a password reset email with instructions to reset my password
    Then I click the link in the password reset email
    And I should be taken to the password reset page
    And I enter a new password "StrongPass123New" that meets the password policy
    And I enter a new password "StrongPass123New" again to confirm
    And I submit the new password
    Given I open the login page
    Then I should be on the login page
    When I login in with the generated plus email and "StrongPass123New"
    Then the login should be successful and land on the products page
    # after resetting the password, if the user tries to verify the email with the original verification email,
    # it should show that he is already verified instead of successfully verifying again
    And I log into its email account through the API and find the verification email
    And the verification email sender should be correct
    And I click the link in the verification email
    Then I should see message "Your email is already verified. You can sign in."