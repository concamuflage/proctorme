#!/usr/bin/env node

const bcrypt = require("bcryptjs");
const { Pool } = require("pg");
require("../lib/server/config/env");
const { isStrongPassword, PASSWORD_REQUIREMENTS_MESSAGE } = require("../shared/passwordPolicy");

/**
 * Reads a required environment variable for the manual user setup script.
 *
 * @param {string} name - Environment variable name.
 * @returns {string} Configured environment variable value.
 */
function requiredEnv(name) {
  const value = process.env[name];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

/**
 * Builds the PostgreSQL connection config from root `.env` values.
 *
 * @returns {import("pg").PoolConfig} PostgreSQL pool configuration.
 */
function postgresConfig() {
  return {
    host: requiredEnv("PGHOST"),
    port: Number(requiredEnv("PGPORT")),
    database: requiredEnv("PGDATABASE"),
    user: requiredEnv("PGUSER"),
    password: requiredEnv("PGPASSWORD"),
  };
}

/**
 * Normalizes an email address for local auth storage.
 *
 * @param {string} value - Email address provided from the command line.
 * @returns {string} Lowercase trimmed email address.
 */
function normalizeEmail(value) {
  return value.trim().toLowerCase();
}

/**
 * Normalizes a display-name field for local auth storage.
 *
 * @param {string | undefined} value - Optional name value from the command line.
 * @param {string} fallback - Value to use when no name is provided.
 * @returns {string} Trimmed name value.
 */
function normalizeName(value, fallback) {
  const normalized = value?.trim();
  return normalized || fallback;
}

/**
 * Ensures the local users table has the columns needed by local auth.
 *
 * @param {Pool} pool - PostgreSQL connection pool.
 * @returns {Promise<void>} Resolves when the table shape has been ensured.
 */
async function ensureUsersTable(pool) {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      email_verified BOOLEAN NOT NULL DEFAULT FALSE,
      email_verification_token TEXT,
      email_verification_expires TIMESTAMP,
      deleted_at TIMESTAMP WITH TIME ZONE,
      deleted_email TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`
  );
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token TEXT");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMP");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token TEXT");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_email TEXT");
}

/**
 * Creates or updates a verified local user with no assigned roles.
 *
 * @param {Pool} pool - PostgreSQL connection pool.
 * @param {{ email: string; password: string; firstName: string; lastName: string }} user - User values to store.
 * @returns {Promise<{ id: number; created: boolean }>} Stored user id and whether the row was inserted.
 */
async function createVerifiedUser(pool, user) {
  await ensureUsersTable(pool);

  const passwordHash = await bcrypt.hash(user.password, 10);
  const existing = await pool.query(
    "SELECT id FROM users WHERE lower(email) = lower($1) AND deleted_at IS NULL LIMIT 1",
    [user.email]
  );

  if (existing.rows[0]) {
    const userId = Number(existing.rows[0].id);
    await pool.query(
      `
        UPDATE users
        SET email = $2,
            password_hash = $3,
            first_name = $4,
            last_name = $5,
            email_verified = TRUE,
            email_verification_token = NULL,
            email_verification_expires = NULL,
            password_reset_token = NULL,
            password_reset_expires = NULL
        WHERE id = $1
      `,
      [userId, user.email, passwordHash, user.firstName, user.lastName]
    );
    await pool.query("DELETE FROM user_roles WHERE user_id = $1", [userId]);
    return { id: userId, created: false };
  }

  const inserted = await pool.query(
    `
      INSERT INTO users (
        email,
        password_hash,
        first_name,
        last_name,
        email_verified,
        email_verification_token,
        email_verification_expires,
        password_reset_token,
        password_reset_expires
      )
      VALUES ($1, $2, $3, $4, TRUE, NULL, NULL, NULL, NULL)
      RETURNING id
    `,
    [user.email, passwordHash, user.firstName, user.lastName]
  );
  const userId = Number(inserted.rows[0].id);
  await pool.query("DELETE FROM user_roles WHERE user_id = $1", [userId]);
  return { id: userId, created: true };
}

/**
 * Parses command-line arguments for the manual user setup script.
 *
 * @returns {{ email: string; password: string; firstName: string; lastName: string }} Parsed user values.
 */
function parseArgs() {
  const [, , rawEmail, password, firstName, lastName] = process.argv;
  if (!rawEmail || !password) {
    throw new Error(
      "Usage: npm run user:create-verified -- <email> <password> [firstName] [lastName]"
    );
  }

  const email = normalizeEmail(rawEmail);
  if (!email) throw new Error("Email is required.");
  if (!isStrongPassword(password)) throw new Error(PASSWORD_REQUIREMENTS_MESSAGE);

  return {
    email,
    password,
    firstName: normalizeName(firstName, "Manual"),
    lastName: normalizeName(lastName, "User"),
  };
}

/**
 * Runs the manual verified-user setup script.
 *
 * @returns {Promise<void>} Resolves when the user has been created or updated.
 */
async function main() {
  const user = parseArgs();
  const pool = new Pool(postgresConfig());

  try {
    const result = await createVerifiedUser(pool, user);
    const action = result.created ? "Created" : "Updated";
    console.log(`${action} verified no-role user ${user.email} with id ${result.id}.`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
