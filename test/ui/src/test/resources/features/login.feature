Feature: Login

    Scenario: user can reset the password
    
        Given I am on the login page
        When I click on the "Forgot Password" link
        And I enter my email address and submit the form
        Then I should see a confirmation message that a password reset email has been sent
        And I should receive a password reset email with instructions to reset my password
        Given I am on the login page
        And I login in with username "12 / 34" and password "12 / 34"
