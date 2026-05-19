# UI Tests

This folder contains Selenium + TestNG + Cucumber UI tests for the cart flow.

## Prerequisites

1. Start the app:

```bash
npm run dev:full
```

2. Make sure the site is reachable at `http://localhost:3000`.

## Run tests

From `test/ui`:

```bash
mvn test
```

To run against a different base URL:

```bash
mvn test -DbaseUrl=http://localhost:3000
```

To run with the browser visible:

```bash
mvn test -Dheadless=false
```

## Login-required scenario

The protected-cart scenario needs a valid test account:

```bash
mvn test \
  -DtestUserEmail=your-email@example.com \
  -DtestUserPassword=your-password
```

Or export environment variables once and reuse them:

```bash
export TEST_USER_EMAIL=your-email@example.com
export TEST_USER_PASSWORD=your-password
mvn test
```

Or store them locally in `test/ui/.env.local`:

```bash
TEST_USER_EMAIL=your-email@example.com
TEST_USER_PASSWORD=your-password
TEST_UNVERIFIED_USER_EMAIL=your-unverified-email@example.com
TEST_UNVERIFIED_USER_PASSWORD=your-unverified-password
TEST_SIGNUP_EMAIL=concamuflage@gmail.com
TEST_SIGNUP_PASSWORD=StrongPass123A
PGHOST=localhost
PGPORT=5432
PGDATABASE=your_database_name
PGUSER=your_database_user
PGPASSWORD=your_database_password
```

`TEST_SIGNUP_EMAIL` is used by the signup flow and should be set explicitly for signup scenarios.
`TEST_UNVERIFIED_USER_EMAIL` and `TEST_UNVERIFIED_USER_PASSWORD` are used by the unverified-login scenario.
`TEST_SIGNUP_PASSWORD` is used by the specified-email signup scenario and falls back to `StrongPass123A`.
The `@Signup` hook deletes `TEST_SIGNUP_EMAIL` directly from the `users` table before and after each signup scenario. It needs either `TEST_DATABASE_URL` or the `PGHOST`/`PGPORT`/`PGDATABASE`/`PGUSER`/`PGPASSWORD` variables.

Then you can run the login scenario without extra flags:

```bash
mvn test -Dcucumber.filter.name="Login-required cart flow"
```
