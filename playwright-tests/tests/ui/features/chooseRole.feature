Feature: user with no roles should be asked to choose a role.

Scenario: new user with no roles should be asked to choose a role
    Given I have a verified generated user with no roles
    Given I open the login page
    Then I should be on the login page
    When I log in with the generated user
    Then the login should be successful and land on the role choice page
