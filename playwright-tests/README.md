# Playwright Tests

This folder is self-contained so you can learn Playwright without changing the existing Selenium/Cucumber UI tests.

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
npm run test:headed
npm run test:ui
npm run report
```

## Files

- `playwright.config.ts`: Playwright configuration.
- `tests/smoke.spec.ts`: starter tests for home, signup, and login pages.
