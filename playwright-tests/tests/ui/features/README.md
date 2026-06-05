# UI Cucumber Features

Put browser UI `.feature` files in this folder.

Example:

```gherkin
Feature: Login page

  Scenario: Visitor opens login
    Given I open the "/login" page
    Then the page should show "Welcome back"
```

Run UI Cucumber tests with:

```bash
npm run test:ui
```
