Feature: Proctor application API
  Verified users should be able to save drafts and submit valid proctor applications,
  while invalid or locked applications should be rejected with actionable responses.

  Background:
    Given I have a verified proctor application API user
    And the proctor application API user is signed in

  Scenario: An incomplete proctor application can be saved as a draft
    Given I have an incomplete proctor application payload
    When I save the proctor application draft through the API
    Then the proctor application draft is saved
    And the saved proctor application has draft status

  Scenario: A draft rejects a non-education school email address
    Given I have a proctor application draft with a non-education school email address
    When I save the proctor application draft through the API
    Then the proctor application API rejects the school email address
    And the response identifies the school email validation error
    And the invalid proctor application draft is not saved

  Scenario: Final validation identifies the form section containing an error
    Given I have a complete proctor application payload with one invalid form section
    When I submit the proctor application through the API
    Then the proctor application API rejects the submission
    And the response identifies the invalid form section
    And the invalid proctor application is not submitted

  Scenario: A complete proctor application can be submitted
    Given I have a complete valid proctor application payload
    When I submit the proctor application through the API
    Then the proctor application is submitted
    And the submitted proctor application has pending status

  Scenario: A locked proctor application cannot be changed
    Given I have a locked proctor application
    When I try to change the locked proctor application through the API
    Then the proctor application API rejects the change as a conflict
    And the locked proctor application is unchanged
