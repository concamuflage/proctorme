# Playwright Tests

This folder is self-contained and separates API and UI tests. Both API and UI
workflow tests use Cucumber/Gherkin, with Playwright used inside the step
definitions for HTTP requests and browser control. Step definitions and support
files are written in TypeScript and loaded through `tsx`.

## First-time setup

```bash
cd playwright-tests
npm install
npm run install:browsers
```

## Run against your local app

Start the app from the project root:

```bash
npm run dev:full
```

Then run Playwright from this folder:

```bash
cd playwright-tests
npm test
```

`npm test` runs the API Cucumber suite by default.

The default base URL is:

```text
http://localhost:3000
```

To use another URL:

```bash
PLAYWRIGHT_BASE_URL=https://outlierfit.shop npm test
```

## Useful commands

```bash
# API tests
npm run test:api

# UI browser tests
npm run test:ui
npm run test:ui:headed

# TypeScript check
npm run typecheck

```

## Files

- `cucumber.js`: Cucumber profiles for API and UI suites.
- `tests/api`: API tests, API Cucumber features, and the API catalog.
- `tests/ui/features`: UI Cucumber feature files.
- `tests/ui/pages`: UI Page Object classes.
- `tests/ui/support`: UI helper modules.
- `tests/ui/step-definitions`: UI Cucumber step definitions.
