Feature: Institution users rate proctor bookings
  Institution users should only be able to rate bookings that are completed.

  Scenario: An institution user can rate completed bookings only
    Given an institution user exists
    And the institution user has a completed booking and a normal booking for Avery Chen
    And the institution user is signed in
    When the institution user rates the completed booking
    Then the completed booking rating is saved
    When the institution user rates the normal booking
    Then the normal booking rating is rejected
    And no rating is saved for the normal booking
