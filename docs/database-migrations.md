# Database Migrations

This project uses `node-pg-migrate` for PostgreSQL schema migrations.

Set `DATABASE_URL` to the target database before running migrations:

```sh
DATABASE_URL="postgres://USER:PASSWORD@HOST:5432/DB_NAME" npm run migrate:up
```

Create a new migration:

```sh
npm run migrate:create add_some_change
```

The first migration is a baseline snapshot of the current local schema. It is intended for an empty production database. If production already has tables, diff the schema first instead of applying the baseline directly.
