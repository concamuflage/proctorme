import crypto from "crypto";
import bcrypt from "bcryptjs";
import pool from "@/lib/server/database/pool";
import { PASSWORD_REQUIREMENTS_MESSAGE, isStrongPassword } from "@/shared/passwordPolicy";
import { SITE_NAME } from "@/lib/proctor";

// User-facing messages reused by the local authentication flows.
const EMAIL_NOT_VERIFIED_MESSAGE = "Please verify your email before signing in.";
const SIGNUP_SUCCESS_MESSAGE = "Check your email to verify your account before signing in.";
const PASSWORD_RESET_REQUEST_MESSAGE = "If that account exists, a password reset email has been sent.";
// Default expiration windows for email verification and password reset tokens.
const DEFAULT_VERIFICATION_TTL_HOURS = 24;
const DEFAULT_PASSWORD_RESET_TTL_MINUTES = 30;
// Safe production fallback used when no public app URL is configured.
const PRODUCTION_APP_BASE_URL = "https://outlierfit.shop";

// Shape of user rows returned from PostgreSQL queries.
// Values are typed as unknown because database results need runtime normalization.
type UserRow = {
  id: unknown;
  email: unknown;
  first_name: unknown;
  last_name?: unknown;
  password_hash?: unknown;
  email_verified?: unknown;
  email_verification_token?: unknown;
  email_verification_expires?: unknown;
  password_reset_token?: unknown;
  password_reset_expires?: unknown;
};

// Converts unknown input into a trimmed string, or an empty string when invalid.
/**
 * Runs the text logic for this module.
 *
 * @param value - Input used by text.
 *
 * @returns The result used by the surrounding flow.
 */
function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

// Normalizes emails for consistent lookup and storage.
/**
 * Normalizes email into the shape this flow expects.
 *
 * @param value - Input used by normalize email.
 *
 * @returns The normalized value.
 */
function normalizeEmail(value: unknown) {
  return text(value).toLowerCase();
}

// Normalizes first and last names from request payloads.
/**
 * Normalizes name into the shape this flow expects.
 *
 * @param value - Input used by normalize name.
 *
 * @returns The normalized value.
 */
function normalizeName(value: unknown) {
  return text(value);
}

// Reads a positive numeric environment variable, otherwise falls back to a default.
/**
 * Runs the numeric env logic for this module.
 *
 * @param name - Input used by numeric env.
 * @param fallback - Input used by numeric env.
 *
 * @returns The result used by the surrounding flow.
 */
function numericEnv(name: string, fallback: number) {
  const value = Number(process.env[name] || fallback);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

// Hashes verification/reset tokens before storing them in the database.
// The raw token is only sent to the user's email link.
/**
 * Runs the hash token logic for this module.
 *
 * @param token - Input used by hash token.
 *
 * @returns The result used by the surrounding flow.
 */
function hashToken(token: string) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

// Creates a secure random token, its database-safe hash, and its expiration time.
/**
 * Creates token for this flow.
 *
 * @param ttlMs - Input used by create token.
 *
 * @returns The result used by the surrounding flow.
 */
function createToken(ttlMs: number) {
  const rawToken = crypto.randomBytes(32).toString("hex");
  return {
    rawToken,
    hashedToken: hashToken(rawToken),
    expiresAt: new Date(Date.now() + ttlMs),
  };
}

// Normalizes an app base URL and removes trailing slashes.
/**
 * Normalizes app base url into the shape this flow expects.
 *
 * @param value - Input used by normalize app base url.
 *
 * @returns The normalized value.
 */
function normalizeAppBaseUrl(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim().replace(/\/+$/, "") : "";
}

// Checks whether a URL points to a local development host.
/**
 * Checks whether localhost url is true for this flow.
 *
 * @param value - Input used by is localhost url.
 *
 * @returns True when the value satisfies the check.
 */
function isLocalhostUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" || parsed.hostname === "::1";
  } catch {
    return false;
  }
}

// Chooses the public app URL used in email links.
// In production, localhost URLs are avoided so users receive a usable public link.
/**
 * Runs the app base url logic for this module.
 *
 * @param explicitEnvName - Input used by app base url.
 *
 * @returns The result used by the surrounding flow.
 */
function appBaseUrl(explicitEnvName: string) {
  const explicitUrl = normalizeAppBaseUrl(process.env[explicitEnvName]);
  if (explicitUrl) return explicitUrl;

  const fallbackUrls = [
    normalizeAppBaseUrl(process.env.CLIENT_ORIGIN),
    normalizeAppBaseUrl(process.env.NEXTAUTH_URL),
  ].filter(Boolean);

  if (process.env.NODE_ENV === "production") {
    return fallbackUrls.find((url) => !isLocalhostUrl(url)) || PRODUCTION_APP_BASE_URL;
  }

  return fallbackUrls[0] || "http://localhost:3000";
}

// Builds the verification URL sent to users after signup or resend requests.
/**
 * Builds email verification link for this flow.
 *
 * @param email - Input used by build email verification link.
 * @param token - Input used by build email verification link.
 *
 * @returns The result used by the surrounding flow.
 */
function buildEmailVerificationLink(email: string, token: string) {
  const params = new URLSearchParams({ email, token });
  return `${appBaseUrl("EMAIL_VERIFICATION_APP_URL")}/verify-email?${params.toString()}`;
}

// Builds the password reset URL sent to users who request a reset.
/**
 * Builds password reset link for this flow.
 *
 * @param email - Input used by build password reset link.
 * @param token - Input used by build password reset link.
 *
 * @returns The result used by the surrounding flow.
 */
function buildPasswordResetLink(email: string, token: string) {
  const params = new URLSearchParams({ email, token });
  return `${appBaseUrl("PASSWORD_RESET_APP_URL")}/reset-password?${params.toString()}`;
}

// Sends an email through Resend using both HTML and plain-text bodies.
/**
 * Sends resend email for this flow.
 *
 * @param to, subject, html, plainText - Input used by send resend email.
 *
 * @returns The result used by the surrounding flow.
 */
async function sendResendEmail({ to, subject, html, plainText }: { to: string; subject: string; html: string; plainText: string }) {
  // Resend requires an API key and a verified sender address.
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) throw new Error("Missing Resend configuration. Set RESEND_API_KEY and RESEND_FROM_EMAIL.");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(10_000),
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      text: plainText,
    }),
  });

  if (!response.ok) {
    const payload = await response.text().catch(() => "");
    throw new Error(`Resend request failed with status ${response.status}. ${payload}`.trim());
  }
}

// Creates or updates the users table so local auth has the columns it needs.
// This is useful for development, but production apps usually prefer migrations.
/**
 * Runs the ensure users table logic for this module.
 *
 * @returns The result used by the surrounding flow.
 */
async function ensureUsersTable() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      email_verified BOOLEAN NOT NULL DEFAULT FALSE,
      email_verification_token TEXT,
      email_verification_expires TIMESTAMP,
      deleted_at TIMESTAMP WITH TIME ZONE,
      deleted_email TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )`
  );
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token TEXT");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMP");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token TEXT");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_email TEXT");
}

// Generates a new email verification token, stores its hash, and emails the raw token link.
/**
 * Checks whether sue email verification is true for this flow.
 *
 * @param user - Input used by issue email verification.
 *
 * @returns True when the value satisfies the check.
 */
async function issueEmailVerification(user: UserRow) {
  const ttlHours = numericEnv("EMAIL_VERIFICATION_TTL_HOURS", DEFAULT_VERIFICATION_TTL_HOURS);
  const { rawToken, hashedToken, expiresAt } = createToken(ttlHours * 60 * 60 * 1000);
  const userId = Number(user.id);
  const email = normalizeEmail(user.email);
  const firstName = text(user.first_name) || "there";
  const verificationLink = buildEmailVerificationLink(email, rawToken);

  // Store only the hashed token so the database never contains the raw email token.
  await pool.query(
    `
      UPDATE users
      SET email_verified = FALSE,
          email_verification_token = $2,
          email_verification_expires = $3
      WHERE id = $1
    `,
    [userId, hashedToken, expiresAt]
  );

  // Send the raw token to the user inside the verification link.
  try {
    await sendResendEmail({
      to: email,
      subject: `Verify your ${SITE_NAME} account`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #18181b;">
          <p>Hi ${firstName},</p>
          <p>Welcome to ${SITE_NAME}, and thank you for creating an account with us.</p>
          <p>To finish setting up your account, please verify your email address by clicking the button below.</p>
          <p><a href="${verificationLink}" style="display:inline-block;padding:12px 20px;background:#18181b;color:#ffffff;text-decoration:none;border-radius:9999px;">Verify email</a></p>
          <p>If the button does not work, please copy and paste this link into your browser:</p>
          <p><a href="${verificationLink}">${verificationLink}</a></p>
        </div>
      `,
      plainText: `Hi ${firstName},\n\nWelcome to ${SITE_NAME}.\n\nVerify your email:\n${verificationLink}\n`,
    });
  } catch (error) {
    console.error("verification email error:", error);
    if (process.env.NODE_ENV === "production") throw error;
  }
}

// Generates a password reset token, stores its hash, and emails the raw reset link.
/**
 * Checks whether sue password reset is true for this flow.
 *
 * @param user - Input used by issue password reset.
 *
 * @returns True when the value satisfies the check.
 */
async function issuePasswordReset(user: UserRow) {
  const ttlMinutes = numericEnv("PASSWORD_RESET_TTL_MINUTES", DEFAULT_PASSWORD_RESET_TTL_MINUTES);
  const { rawToken, hashedToken, expiresAt } = createToken(ttlMinutes * 60 * 1000);
  const userId = Number(user.id);
  const email = normalizeEmail(user.email);
  const firstName = text(user.first_name) || "there";
  const resetLink = buildPasswordResetLink(email, rawToken);

  // Store only the hashed reset token in the database.
  await pool.query(
    `
      UPDATE users
      SET password_reset_token = $2,
          password_reset_expires = $3
      WHERE id = $1
    `,
    [userId, hashedToken, expiresAt]
  );

  // Send the raw reset token to the user inside the reset link.
  try {
    await sendResendEmail({
      to: email,
      subject: `Reset your ${SITE_NAME} password`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #18181b;">
          <p>Hi ${firstName},</p>
          <p>We received a request to reset the password for your ${SITE_NAME} account.</p>
          <p>This link is valid for ${ttlMinutes} minutes.</p>
          <p><a href="${resetLink}" style="display:inline-block;padding:12px 20px;background:#18181b;color:#ffffff;text-decoration:none;border-radius:9999px;">Reset password</a></p>
          <p>If the button does not work, please copy and paste this link into your browser:</p>
          <p><a href="${resetLink}">${resetLink}</a></p>
        </div>
      `,
      plainText: `Hi ${firstName},\n\nReset your ${SITE_NAME} password:\n${resetLink}\n`,
    });
  } catch (error) {
    console.error("password reset email error:", error);
    if (process.env.NODE_ENV === "production") throw error;
  }
}

// Handles local user signup: validates input, creates the user, and sends verification email.
/**
 * Runs the signup user logic for this module.
 *
 * @param payload - Input used by signup user.
 *
 * @returns The result used by the surrounding flow.
 */
export async function signupUser(payload: unknown) {
  // Safely treat the incoming payload as an object before reading fields.
  const data = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const email = normalizeEmail(data.email);
  const password = typeof data.password === "string" ? data.password : "";
  const firstName = normalizeName(data.firstName);
  const lastName = normalizeName(data.lastName);

  // Require all signup fields before creating an account.
  if (!email || !password || !firstName || !lastName) {
    return { status: 400, body: { error: "Email, password, first name, and last name are required" } };
  }
  if (!isStrongPassword(password)) return { status: 400, body: { error: PASSWORD_REQUIREMENTS_MESSAGE } };

  await ensureUsersTable();
  // Check for an existing active account with the same email.
  const existing = await pool.query<UserRow>(
    "SELECT id, email, first_name, email_verified FROM users WHERE email = $1 AND deleted_at IS NULL",
    [email]
  );
  if (existing.rows[0]) {
    if (!existing.rows[0].email_verified) {
      await issueEmailVerification(existing.rows[0]);
      return { status: 409, body: { error: "An account with this email already exists. We sent a new verification email." } };
    }
    return { status: 409, body: { error: "An account with this email already exists. Please sign in." } };
  }

  // Hash the password before storing it.
  const passwordHash = await bcrypt.hash(password, 10);
  const result = await pool.query<UserRow>(
    `
      INSERT INTO users (email, password_hash, first_name, last_name, email_verified, email_verification_token, email_verification_expires)
      VALUES ($1, $2, $3, $4, FALSE, NULL, NULL)
      RETURNING id, email, first_name, last_name
    `,
    [email, passwordHash, firstName, lastName]
  );
  await issueEmailVerification(result.rows[0]);
  return {
    status: 201,
    body: {
      id: Number(result.rows[0].id),
      email: text(result.rows[0].email),
      firstName: text(result.rows[0].first_name),
      lastName: text(result.rows[0].last_name),
      message: SIGNUP_SUCCESS_MESSAGE,
    },
  };
}

/**
 * Query the database to to check if the user exists and the password is correct.
 *
 * The payload is expected to contain `email` and `password` fields. The email is
 * normalized before lookup, the password is compared against the stored bcrypt
 * hash, and unverified accounts are blocked from signing in.
 *
 * @param payload - Unknown request body or credentials object containing email and password.
 * @returns A response-like object with a numeric status and body:
 * - `200` with user id, email, name fields, and email verification state on success.
 * - `400` when email or password is missing.
 * - `401` when credentials do not match an active user.
 * - `403` when the account exists but email verification is still required.
 */

export async function checkCredentialsInDb(payload: unknown) {
  const data = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const email = normalizeEmail(data.email);
  const password = typeof data.password === "string" ? data.password : "";
  if (!email || !password) return { status: 400, body: { error: "Email and password are required" } };

  await ensureUsersTable();
  // Load the active user by normalized email.
  const result = await pool.query<UserRow>(
    `
      SELECT id, email, first_name, last_name, password_hash, email_verified
      FROM users
      WHERE email = $1
        AND deleted_at IS NULL
    `,
    [email]
  );
  const user = result.rows[0];
  // Compare the submitted password with the stored bcrypt hash.
  if (!user || !await bcrypt.compare(password, text(user.password_hash))) {
    return { status: 401, body: { error: "Invalid credentials" } };
  }
  
  // Block login until the user verifies their email address.
  if (!user.email_verified) {
    return { status: 403, body: { error: EMAIL_NOT_VERIFIED_MESSAGE, code: "EMAIL_NOT_VERIFIED" } };
  }
  return {
    status: 200,
    body: {
      id: Number(user.id),
      email: text(user.email),
      firstName: text(user.first_name),
      lastName: text(user.last_name),
      emailVerified: user.email_verified === true,
    },
  };
}

// Verifies an email confirmation link by comparing the submitted token with the stored hash.
/**
 * Runs the verify email token logic for this module.
 *
 * @param emailValue - Input used by verify email token.
 * @param tokenValue - Input used by verify email token.
 *
 * @returns The result used by the surrounding flow.
 */
export async function verifyEmailToken(emailValue: unknown, tokenValue: unknown) {
  const email = normalizeEmail(emailValue);
  const token = text(tokenValue);
  if (!email || !token) return { status: 400, body: { error: "Email and token are required." } };

  await ensureUsersTable();
  const result = await pool.query<UserRow>(
    `
      SELECT id, email_verified, email_verification_token, email_verification_expires
      FROM users
      WHERE email = $1
        AND deleted_at IS NULL
    `,
    [email]
  );
  const user = result.rows[0];
  if (!user) return { status: 400, body: { error: "Invalid or expired verification link." } };
  if (user.email_verified) return { status: 200, body: { message: "Your email is already verified. You can sign in." } };

  // Validate that the stored verification token exists and has not expired.
  const expiresAt = user.email_verification_expires ? new Date(String(user.email_verification_expires)) : null;
  const isExpired = !expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now();
  if (text(user.email_verification_token) !== hashToken(token) || isExpired) {
    if (isExpired) {
      await pool.query("UPDATE users SET email_verification_token = NULL, email_verification_expires = NULL WHERE id = $1", [Number(user.id)]);
    }
    return { status: 400, body: { error: "Invalid or expired verification link." } };
  }

  // Mark the email as verified and clear the one-time verification token.
  await pool.query(
    "UPDATE users SET email_verified = TRUE, email_verification_token = NULL, email_verification_expires = NULL WHERE id = $1",
    [Number(user.id)]
  );
  return { status: 200, body: { message: "Email verified successfully. You can now sign in." } };
}

// Sends a new verification email for an existing unverified account.
/**
 * Runs the resend verification email logic for this module.
 *
 * @param payload - Input used by resend verification email.
 *
 * @returns The result used by the surrounding flow.
 */
export async function resendVerificationEmail(payload: unknown) {
  const data = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const email = normalizeEmail(data.email);
  if (!email) return { status: 400, body: { error: "Email is required." } };

  await ensureUsersTable();
  const result = await pool.query<UserRow>(
    "SELECT id, email, first_name, email_verified FROM users WHERE email = $1 AND deleted_at IS NULL",
    [email]
  );
  const user = result.rows[0];
  // Do not reveal whether the email exists.
  if (!user) return { status: 200, body: { message: "If that account exists, a verification email has been sent." } };
  if (user.email_verified) return { status: 400, body: { error: "This email is already verified. Please sign in." } };

  await issueEmailVerification(user);
  return { status: 200, body: { message: "Verification email sent." } };
}

// Starts the password reset flow without revealing whether the email exists.
/**
 * Runs the request password reset logic for this module.
 *
 * @param payload - Input used by request password reset.
 *
 * @returns The result used by the surrounding flow.
 */
export async function requestPasswordReset(payload: unknown) {
  const data = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const email = normalizeEmail(data.email);
  if (!email) return { status: 400, body: { error: "A valid email is required." } };

  await ensureUsersTable();
  const result = await pool.query<UserRow>(
    "SELECT id, email, first_name FROM users WHERE email = $1 AND deleted_at IS NULL LIMIT 1",
    [email]
  );
  // Only send a reset email when the account exists, but always return the same public message.
  if (result.rows[0]) await issuePasswordReset(result.rows[0]);
  return { status: 200, body: { message: PASSWORD_RESET_REQUEST_MESSAGE } };
}

// Completes the password reset flow by validating the token and saving a new password hash.
/**
 * Runs the reset password logic for this module.
 *
 * @param payload - Input used by reset password.
 *
 * @returns The result used by the surrounding flow.
 */
export async function resetPassword(payload: unknown) {
  const data = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const email = normalizeEmail(data.email);
  const token = text(data.token);
  const password = typeof data.password === "string" ? data.password : "";
  if (!email || !token || !password) return { status: 400, body: { error: "Email, token, and password are required." } };
  if (!isStrongPassword(password)) return { status: 400, body: { error: PASSWORD_REQUIREMENTS_MESSAGE } };

  await ensureUsersTable();
  const result = await pool.query<UserRow>(
    "SELECT id, password_reset_token, password_reset_expires FROM users WHERE email = $1 AND deleted_at IS NULL LIMIT 1",
    [email]
  );
  const user = result.rows[0];
  if (!user) return { status: 400, body: { error: "Invalid or expired reset link." } };

  // Validate that the reset token matches and is still within its expiration window.
  const expiresAt = user.password_reset_expires ? new Date(String(user.password_reset_expires)) : null;
  const isExpired = !expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now();
  if (text(user.password_reset_token) !== hashToken(token) || isExpired) {
    if (isExpired) {
      await pool.query("UPDATE users SET password_reset_token = NULL, password_reset_expires = NULL WHERE id = $1", [Number(user.id)]);
    }
    return { status: 400, body: { error: "Invalid or expired reset link." } };
  }

  // Hash the new password and clear all reset/verification tokens.
  const passwordHash = await bcrypt.hash(password, 10);
  await pool.query(
    `
      UPDATE users
      SET password_hash = $2,
          password_reset_token = NULL,
          password_reset_expires = NULL,
          email_verified = TRUE,
          email_verification_token = NULL,
          email_verification_expires = NULL
      WHERE id = $1
    `,
    [Number(user.id), passwordHash]
  );
  return { status: 200, body: { message: "Your password has been reset. You can now sign in." } };
}
