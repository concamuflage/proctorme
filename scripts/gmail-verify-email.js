#!/usr/bin/env node

const http = require("http");
const fs = require("fs");
const path = require("path");

const DEFAULT_REDIRECT_URI = "http://localhost:3000/api/auth/callback/google";
const DEFAULT_API_BASE_URL = "http://127.0.0.1:4000";
const DEFAULT_TARGET_EMAIL = "unodostreszlm@gmail.com";
const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(path.join(process.cwd(), ".env.local"));

function requiredEnv(name) {
  const value = process.env[name];
  if (!value || value === "change-me") {
    throw new Error(`Missing ${name}. Set it in your shell before running this script.`);
  }
  return value;
}

function base64UrlDecode(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf8");
}

function collectBodyParts(part, chunks = []) {
  if (!part) return chunks;
  if (part.body?.data) chunks.push(base64UrlDecode(part.body.data));
  if (Array.isArray(part.parts)) {
    for (const child of part.parts) collectBodyParts(child, chunks);
  }
  return chunks;
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function findVerificationLink(message) {
  const body = decodeHtmlEntities(collectBodyParts(message.payload).join("\n"));
  const matches = body.match(/https?:\/\/[^\s"'<>]+\/verify-email\?[^\s"'<>]+/g) || [];
  return matches.find((link) => link.includes("token=") && link.includes("email=")) || null;
}

async function apiFetch(url, accessToken, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`${url} failed with ${response.status}: ${JSON.stringify(payload)}`);
  }

  return payload;
}

function waitForOAuthCode(redirectUri) {
  const redirect = new URL(redirectUri);

  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const requestUrl = new URL(req.url, redirect.origin);
      if (requestUrl.pathname !== redirect.pathname) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      const error = requestUrl.searchParams.get("error");
      const code = requestUrl.searchParams.get("code");

      res.writeHead(error ? 400 : 200, { "Content-Type": "text/plain" });
      res.end(error ? `OAuth failed: ${error}` : "OAuth complete. You can close this tab.");
      server.close();

      if (error) reject(new Error(`OAuth failed: ${error}`));
      else if (!code) reject(new Error("OAuth callback did not include a code."));
      else resolve(code);
    });

    server.once("error", reject);
    server.listen(Number(redirect.port || 80), redirect.hostname);
  });
}

async function exchangeCodeForToken({ code, clientId, clientSecret, redirectUri }) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.access_token) {
    throw new Error(`Token exchange failed: ${JSON.stringify(payload)}`);
  }

  return payload.access_token;
}

async function verifyLatestEmail({ accessToken, targetEmail, apiBaseUrl }) {
  const profile = await apiFetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", accessToken);
  if (profile.emailAddress?.toLowerCase() !== targetEmail.toLowerCase()) {
    throw new Error(`Authorized Gmail account is ${profile.emailAddress}, expected ${targetEmail}.`);
  }

  const query =
    process.env.GMAIL_QUERY ||
    `to:${targetEmail} subject:"Verify your OutlierFit account" newer_than:14d`;
  const listUrl = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
  listUrl.searchParams.set("maxResults", "10");
  listUrl.searchParams.set("includeSpamTrash", "true");
  listUrl.searchParams.set("q", query);

  const list = await apiFetch(listUrl, accessToken);
  const messages = list.messages || [];
  if (messages.length === 0) {
    throw new Error(`No verification emails found for query: ${query}`);
  }

  for (const candidate of messages) {
    const message = await apiFetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${candidate.id}?format=full`,
      accessToken
    );
    const verificationLink = findVerificationLink(message);
    if (!verificationLink) continue;

    const parsedLink = new URL(verificationLink);
    const verifyUrl = new URL("/auth/verify-email", apiBaseUrl);
    verifyUrl.search = parsedLink.search;

    const response = await fetch(verifyUrl);
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(`Verification request failed with ${response.status}: ${JSON.stringify(payload)}`);
    }

    return {
      gmailMessageId: candidate.id,
      verificationLink,
      backendResponse: payload,
    };
  }

  throw new Error("Found matching Gmail messages, but none contained a verification link.");
}

async function main() {
  const clientId = requiredEnv("GOOGLE_CLIENT_ID");
  const clientSecret = requiredEnv("GOOGLE_CLIENT_SECRET");
  const targetEmail = process.env.GMAIL_TARGET_EMAIL || DEFAULT_TARGET_EMAIL;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || DEFAULT_REDIRECT_URI;
  const apiBaseUrl = process.env.API_BASE_URL || DEFAULT_API_BASE_URL;

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", GMAIL_SCOPE);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("login_hint", targetEmail);

  const codePromise = waitForOAuthCode(redirectUri);
  console.log("Open this URL and approve Gmail read access:");
  console.log(authUrl.toString());

  const code = await codePromise;
  const accessToken = await exchangeCodeForToken({ code, clientId, clientSecret, redirectUri });
  const result = await verifyLatestEmail({ accessToken, targetEmail, apiBaseUrl });

  console.log("Verified email successfully.");
  console.log(JSON.stringify({
    gmailMessageId: result.gmailMessageId,
    backendResponse: result.backendResponse,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
