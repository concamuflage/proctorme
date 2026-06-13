import { Pool, type PoolConfig } from "pg";

import "../../../../lib/server/config/env.js";

/**
 * Requires an environment value before allowing this flow to continue.
 *
 * @param name - Environment variable name.
 *
 * @returns The configured environment value.
 */
function requiredEnvValue(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment value: ${name}`);
  return value;
}

/**
 * Builds the database connection config used by API and UI tests.
 *
 * @returns PostgreSQL pool configuration for the test database.
 */
function databaseConfig(): PoolConfig {
  const connectionString = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  if (connectionString) {
    return { connectionString };
  }

  return {
    host: requiredEnvValue("PGHOST"),
    port: Number(process.env.PGPORT || "5432"),
    database: requiredEnvValue("PGDATABASE"),
    user: requiredEnvValue("PGUSER"),
    password: requiredEnvValue("PGPASSWORD"),
  };
}

export const testDbPool = new Pool(databaseConfig());

/**
 * Closes the shared test database pool after a test run.
 *
 * @returns Promise that resolves when the pool is closed.
 */
export async function endTestDbPool() {
  await testDbPool.end();
}
