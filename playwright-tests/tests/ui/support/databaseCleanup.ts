import { Client, type ClientConfig } from "pg";
import { envValue, requiredEnvValue } from "./testEnv";

function databaseConfig(): ClientConfig {
  const connectionString = envValue("TEST_DATABASE_URL") || envValue("DATABASE_URL");
  if (connectionString) {
    return { connectionString };
  }

  return {
    host: requiredEnvValue("PGHOST"),
    port: Number(envValue("PGPORT", "5432")),
    database: requiredEnvValue("PGDATABASE"),
    user: requiredEnvValue("PGUSER"),
    password: requiredEnvValue("PGPASSWORD"),
  };
}

export async function deleteUserByEmail(email: string | null | undefined) {
  if (!email?.trim()) return;

  const client = new Client(databaseConfig());
  await client.connect();

  try {
    await client.query("DELETE FROM users WHERE lower(email) = lower($1)", [email.trim()]);
  } finally {
    await client.end();
  }
}
