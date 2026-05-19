import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

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
  const projectRoot = path.resolve(cwd, "..");
  const candidatePaths = [
    path.join(cwd, ".env"),
    path.join(cwd, ".env.local"),
    path.join(projectRoot, ".env"),
    path.join(projectRoot, ".env.local"),
    path.join(projectRoot, "backend", ".env"),
    path.join(projectRoot, "backend", "database", ".env"),
    path.join(projectRoot, "test", "ui", ".env"),
    path.join(projectRoot, "test", "ui", ".env.local"),
  ];

  for (const filePath of candidatePaths) {
    loadEnvFile(filePath);
  }
}

loadLocalEnv();

export function envValue(name: string, fallback?: string) {
  return process.env[name] || loadedValues.get(name) || fallback;
}

export function requiredEnvValue(name: string) {
  const value = envValue(name);
  if (!value) {
    throw new Error(`Missing required environment value: ${name}`);
  }
  return value;
}

export function expectedResendFromEmail() {
  return requiredEnvValue("RESEND_FROM_EMAIL");
}

export function generateGmailAlias(email: string) {
  const atIndex = email.indexOf("@");
  if (atIndex <= 0) {
    throw new Error(`Signup email must be valid: ${email}`);
  }

  const localPart = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);
  if (domain.toLowerCase() !== "gmail.com") {
    throw new Error("Generated signup email uses Gmail plus-addressing, so the base email must be a Gmail address.");
  }

  return `${localPart}+ui${randomUUID().replaceAll("-", "")}@gmail.com`;
}
