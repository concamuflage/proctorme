import { Pool, type PoolConfig } from "pg";

import "../../../lib/server/config/env.js";

/**
 * Requires d env value before allowing this flow to continue.
 *
 * @param name - Input used by required env value.
 *
 * @returns The result used by the surrounding flow.
 */
function requiredEnvValue(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment value: ${name}`);
  return value;
}

/**
 * Runs the database config logic for this module.
 *
 * @returns The result used by the surrounding flow.
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
 * Runs the end test db pool logic for this module.
 *
 * @returns The result used by the surrounding flow.
 */
export async function endTestDbPool() {
  await testDbPool.end();
}
