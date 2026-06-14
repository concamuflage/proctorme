Feature: user with no roles should be asked to choose a role.

Scenario: new user with no roles should be asked to choose a role
    Given I have already signed up through the signup API  
    And I verify the email address
    Given I open the login page
    Then I should be on the login page
    When I login in with the generated plus email and password "StrongPass123A"
    Then the login should be successful and land on the role choice page