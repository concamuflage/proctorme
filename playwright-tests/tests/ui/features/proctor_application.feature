Feature: Proctor application

  Scenario: verified user can submit a proctor application
    Given I have a verified generated user with base email "unodostreszlm@gmail.com"
    And I open the login page
    Then I should be on the login page
    When  I login in as the generated user
    Then I should be asked to choose a role 
    And  I choose "Become a Proctor"
    Then I should land on the proctor application page
    Then I should see the profile basics step
    When I complete profile basics with listed options
    And I continue to the next proctor application step
    Then I should see the current address step
    When I complete the current address with listed location options
    And I continue to the next proctor application step
    Then I should see the rates and session length step
    When I complete rates and session length
    And I continue to the next proctor application step
    Then I should see the education step
    When I complete education with listed degree, school, and major
    And I upload a valid diploma file
    And I leave school email blank
    And I authorize education verification
    And I continue to the next proctor application step
    Then I should see the identity and profile media step
    When I upload a valid government ID file
    And I upload a valid profile image file
    And I submit the proctor application
    Then the proctor application should be submitted for admin review


