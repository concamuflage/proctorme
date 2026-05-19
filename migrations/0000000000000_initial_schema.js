// Initial database migration.
//
// This migration loads the full schema from a raw SQL file instead of defining
// tables using pgm helpers. This keeps the schema centralized in SQL.
const fs = require("fs");
const path = require("path");

// `exports.up` is the function node-pg-migrate calls to apply this migration.
// `pgm` is the migration helper object provided by node-pg-migrate, which exposes
// methods to modify the database schema (e.g., createTable, addColumn, or run raw SQL).
exports.up = (pgm) => {
  // Read the initial schema SQL file from the db/schema directory.
  const schemaSql = fs.readFileSync(path.join(__dirname, "..", "db", "schema", "initial_schema.sql"), "utf8");
  // Execute the entire schema SQL against the database.
  pgm.sql(schemaSql);
};

// `exports.down` defines how to roll back this migration.
// Setting it to `false` tells node-pg-migrate that this migration is not reversible.
// This is typical for an initial schema where rollback would mean dropping everything.
exports.down = false;
