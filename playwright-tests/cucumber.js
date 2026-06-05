// Cucumber runs Gherkin-style scenarios. API and UI tests use separate profiles
// because API scenarios use request contexts while UI scenarios use browser pages.
module.exports = {
  default: {
    // Keep the default profile on API tests so `npm test` stays fast.
    paths: ["tests/api/features/**/*.feature"],
    // Register tsx so Cucumber can execute TypeScript support and step files.
    requireModule: ["tsx/cjs"],
    require: [
      "tests/api/features/support/**/*.ts",
      "tests/api/features/step-definitions/**/*.ts",
    ],
    format: ["progress"],
    publishQuiet: true,
  },
  api: {
    // Feature files describe the API scenarios in plain language.
    paths: ["tests/api/features/**/*.feature"],
    requireModule: ["tsx/cjs"],
    // Support files create shared test state; step definitions bind Gherkin text
    // to executable JavaScript.
    require: [
      "tests/api/features/support/**/*.ts",
      "tests/api/features/step-definitions/**/*.ts",
    ],
    // Keep local output compact and avoid publishing reports to Cucumber's cloud.
    format: ["progress"],
    publishQuiet: true,
  },
  ui: {
    // UI feature files describe browser workflows in plain language.
    paths: ["tests/ui/features/**/*.feature"],
    requireModule: ["tsx/cjs"],
    // UI support launches the browser; UI step definitions interact with pages.
    require: [
      "tests/ui/support/**/*.ts",
      "tests/ui/step-definitions/**/*.ts",
    ],
    format: ["progress"],
    publishQuiet: true,
  },
};
