import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

// Stores values loaded from local .env files without overwriting process.env.
const loadedValues = new Map<string, string>();


// Reads key=value pairs from a .env file if it exists.
function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    // Ignore blank lines and comments.
    if (!line || line.startsWith("#")) continue;

    // Split on the first equals sign so values can still contain equals signs.
    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    loadedValues.set(key, value);
  }
}

// Looks for .env files from the current directory, project root, and parent root.
function loadLocalEnv() {
  const cwd = process.cwd();
  // Support running tests from either the project root or a nested test directory.
  const projectRoot = fs.existsSync(path.join(cwd, "package.json")) ? cwd : path.resolve(cwd, "..");
  const parentRoot = path.resolve(projectRoot, "..");
  const candidatePaths = [
    path.join(cwd, ".env"),
    path.join(projectRoot, ".env"),
    path.join(parentRoot, ".env"),
  ];

  // Later files can override earlier loaded values in the local fallback map.
  for (const filePath of candidatePaths) {
    loadEnvFile(filePath);
  }
}

// Load local fallback values once when the helper module is imported.
loadLocalEnv();

// Returns an environment value, preferring real process.env values over local .env fallbacks.
export function envValue(name: string, fallback?: string) {
  return process.env[name] || loadedValues.get(name) || fallback;
}

// Returns a required environment value or fails fast with a clear error message.
export function requiredEnvValue(name: string) {
  const value = envValue(name);
  if (!value) {
    throw new Error(`Missing required environment value: ${name}`);
  }
  return value;
}

// Reads the expected sender email used by Resend-related Playwright tests.
export function expectedResendFromEmail() {
  return requiredEnvValue("RESEND_FROM_EMAIL");
}

// Generates a unique Gmail plus-address alias so signup tests can create fresh accounts.
export function generateGmailAlias(email: string) {
  // Validate that the base address has a local part and domain.
  const atIndex = email.indexOf("@");
  if (atIndex <= 0) {
    throw new Error(`Signup email must be valid: ${email}`);
  }

  const localPart = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);
  // Plus-addressing is only supported here for Gmail test accounts.
  if (domain.toLowerCase() !== "gmail.com") {
    throw new Error("Generated signup email uses Gmail plus-addressing, so the base email must be a Gmail address.");
  }

  // Remove UUID dashes to keep the generated email alias compact.
  return `${localPart}+ui${randomUUID().replaceAll("-", "")}@gmail.com`;
}
