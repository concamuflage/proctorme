const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");
const { Pool } = require("pg");

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return dotenv.parse(fs.readFileSync(filePath));
}

const projectRoot = process.cwd();
const databaseEnv = readEnvFile(path.resolve(projectRoot, "backend", "database", ".env"));
const backendEnv = readEnvFile(path.resolve(projectRoot, "backend", ".env"));

function resolveEnvValue(key) {
  const value = process.env[key] ?? backendEnv[key] ?? databaseEnv[key];
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
