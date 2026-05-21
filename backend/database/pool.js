require("../config/env");
const { Pool } = require("pg");

function resolveEnvValue(key) {
  const value = process.env[key];
  return typeof value === "string" ? value : undefined;
}

const host = resolveEnvValue("PGHOST");
const port = Number(resolveEnvValue("PGPORT") || 5432);
const user = resolveEnvValue("PGUSER");
const password = resolveEnvValue("PGPASSWORD");
const database = resolveEnvValue("PGDATABASE");

if (!host || !user || !password || !database) {
  throw new Error("Missing PostgreSQL configuration. Expected PGHOST, PGUSER, PGPASSWORD, and PGDATABASE.");
}

const pool = new Pool({
  host,
  port,
  user,
  password,
  database,
});

module.exports = pool;
