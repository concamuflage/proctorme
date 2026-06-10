Feature: Signup API


  Scenario: With verification, a user can log in
    Given I have a new signup API user
    When I submit the signup API request
    Then the signup API responds with created account details
    And the signup API user is stored as unverified
    When I log into the signup API user's email account through the API and find the verification email
    And the verification email sender should be correct
    And I click the link in the verification email without using a browser
    Then the verification link should respond with a success status
    When I submit the login API request
    Then the login API responds with the signed-in account
    

  Scenario: Without verification, a user cannot log in
    Given I have a new signup API user
    When I submit the signup API request
    Then the signup API responds with created account details
    And the signup API user is stored as unverified
    When I submit the login API request
    Then the login API requires email verification


  Scenario: Signup rejects a weak password
    Given I have a new signup API user
    When I submit the signup API request with a weak password
    Then the signup API rejects the password

  Scenario: Signup rejects an existing unverified account
    Given I have already signed up through the signup API
    When I submit the signup API request again
    Then the signup API rejects the duplicate unverified account
