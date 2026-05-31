const fs = require("node:fs");
const path = require("node:path");

// Stores values loaded from local .env files so tests can read them even when
// they are not already present in process.env.
const loadedValues = new Map();

// Removes one matching pair of wrapping quotes from values like "abc" or 'abc'.
function stripWrappingQuotes(value) {
  if (value.length < 2) return value;
  const wrappedInDoubleQuotes = value.startsWith("\"") && value.endsWith("\"");
  const wrappedInSingleQuotes = value.startsWith("'") && value.endsWith("'");
  return wrappedInDoubleQuotes || wrappedInSingleQuotes ? value.slice(1, -1) : value;
}

// Reads a .env file and saves KEY=value pairs into loadedValues.
// Blank lines, comments, and invalid lines are ignored.
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    // Use the first "=" as the separator so values can still contain "=".
    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    const value = stripWrappingQuotes(line.slice(separatorIndex + 1).trim());
    loadedValues.set(key, value);
  }
}

// Looks for .env files in the current folder, project root, and parent folder.
// This makes the tests work when they are run from slightly different locations.
function loadLocalEnv() {
  // process.cwd() is the folder where the test command was started.
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

// Load local environment variables once when this support file is imported.
loadLocalEnv();

// Returns an environment value from process.env first, then from loaded .env files,
// and finally falls back to the provided default value.
function envValue(name, fallback) {
  return process.env[name] || loadedValues.get(name) || fallback;
}

// Same as envValue, but throws an error when the value is missing.
function requiredEnvValue(name) {
  const value = envValue(name);
  if (!value) throw new Error(`Missing required environment value: ${name}`);
  return value;
}

module.exports = {
  envValue,
  requiredEnvValue,
};
