import fs from "node:fs";
import path from "node:path";

const loadedValues = new Map<string, string>();

function stripWrappingQuotes(value: string) {
  if (value.length < 2) return value;
  const wrappedInDoubleQuotes = value.startsWith("\"") && value.endsWith("\"");
  const wrappedInSingleQuotes = value.startsWith("'") && value.endsWith("'");
  return wrappedInDoubleQuotes || wrappedInSingleQuotes ? value.slice(1, -1) : value;
}

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    const value = stripWrappingQuotes(line.slice(separatorIndex + 1).trim());
    loadedValues.set(key, value);
  }
}

function loadLocalEnv() {
  const cwd = process.cwd();
  const projectRoot = fs.existsSync(path.join(cwd, "package.json")) ? cwd : path.resolve(cwd, "..");
  const parentRoot = path.resolve(projectRoot, "..");

  for (const filePath of [
    path.join(cwd, ".env"),
    path.join(projectRoot, ".env"),
    path.join(parentRoot, ".env"),
  ]) {
    loadEnvFile(filePath);
  }
}

loadLocalEnv();

export function envValue(name: string, fallback?: string) {
  return process.env[name] || loadedValues.get(name) || fallback;
}

export function requiredEnvValue(name: string) {
  const value = envValue(name);
  if (!value) throw new Error(`Missing required environment value: ${name}`);
  return value;
}
