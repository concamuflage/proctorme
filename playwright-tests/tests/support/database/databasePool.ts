import { Pool, type PoolConfig } from "pg";

import { optionalTestEnv, requiredTestEnv } from "../testEnv";

/**
 * Reads the configured Postgres port.
 *
 * @returns Numeric Postgres port from PGPORT.
 */
function postgresPort() {
  const port = Number(requiredTestEnv("PGPORT"));
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("PGPORT must be a positive integer.");
  }

  return port;
}

/**
 * Builds the database connection config used by API and UI tests.
 *
 * @returns PostgreSQL pool configuration for the test database.
 */
function databaseConfig(): PoolConfig {
  const connectionString =
    optionalTestEnv("TEST_DATABASE_URL") ?? optionalTestEnv("DATABASE_URL");
  if (connectionString) {
    return { connectionString };
  }

  return {
    host: requiredTestEnv("PGHOST"),
    port: postgresPort(),
    database: requiredTestEnv("PGDATABASE"),
    user: requiredTestEnv("PGUSER"),
    password: requiredTestEnv("PGPASSWORD"),
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
