import bcrypt from "bcryptjs";
import { PASSWORD_REQUIREMENTS_MESSAGE, isStrongPassword } from "@/shared/passwordPolicy";
import {
  buildEmailVerificationLink,
  buildPasswordResetLink,
  sendEmailVerificationEmail,
  sendPasswordResetEmail,
} from "@/lib/server/auth/authEmails";
import { createToken, hashToken } from "@/lib/server/auth/authTokens";
import { normalizeEmail, normalizeName, text } from "@/lib/server/auth/authUtils";
import {
  clearEmailVerificationToken,
  clearPasswordResetToken,
  ensureUsersTable,
  findActiveUserForSignup,
  findUserForCredentials,
  findUserForEmailVerification,
  findUserForPasswordReset,
  findUserForPasswordResetRequest,
  findUserForVerificationResend,
  insertLocalUser,
  markUserEmailVerified,
  saveEmailVerificationToken,
  savePasswordResetToken,
  saveResetPassword,
  type UserRow,
} from "@/lib/server/auth/authUsersStore";
import {
  positiveNumberServerEnv,
  serverEnvIsProduction,
} from "@/lib/server/serverEnv";

const EMAIL_NOT_VERIFIED_MESSAGE = "Please verify your email before signing in.";
const SIGNUP_SUCCESS_MESSAGE = "Check your email to verify your account before signing in.";
const PASSWORD_RESET_REQUEST_MESSAGE = "If that account exists, a password reset email has been sent.";
const DEFAULT_VERIFICATION_TTL_HOURS = 24;
const DEFAULT_PASSWORD_RESET_TTL_MINUTES = 30;

/**
 * Generates a new email verification token, stores its hash, and emails the raw token link.
 *
 * @param user - User row that should receive a verification email.
 * @returns Promise that resolves when the token has been stored and email attempted.
 */
async function issueEmailVerification(user: UserRow) {
  const ttlHours = positiveNumberServerEnv("EMAIL_VERIFICATION_TTL_HOURS", DEFAULT_VERIFICATION_TTL_HOURS);
  const { rawToken, hashedToken, expiresAt } = createToken(ttlHours * 60 * 60 * 1000);
  const userId = Number(user.id);
  const email = normalizeEmail(user.email);
  const firstName = text(user.first_name) || "there";
  const verificationLink = buildEmailVerificationLink(email, rawToken);

  await saveEmailVerificationToken(userId, hashedToken, expiresAt);

  try {
    await sendEmailVerificationEmail({ email, firstName, verificationLink });
  } catch (error) {
    console.error("verification email error:", error);
    if (serverEnvIsProduction()) throw error;
  }
}

/**
 * Generates a password reset token, stores its hash, and emails the raw reset link.
 *
 * @param user - User row that should receive a password reset email.
 * @returns Promise that resolves when the token has been stored and email attempted.
 */
async function issuePasswordReset(user: UserRow) {
  const ttlMinutes = positiveNumberServerEnv("PASSWORD_RESET_TTL_MINUTES", DEFAULT_PASSWORD_RESET_TTL_MINUTES);
  const { rawToken, hashedToken, expiresAt } = createToken(ttlMinutes * 60 * 1000);
  const userId = Number(user.id);
  const email = normalizeEmail(user.email);
  const firstName = text(user.first_name) || "there";
  const resetLink = buildPasswordResetLink(email, rawToken);

  await savePasswordResetToken(userId, hashedToken, expiresAt);

  try {
    await sendPasswordResetEmail({ email, firstName, resetLink, ttlMinutes });
  } catch (error) {
    console.error("password reset email error:", error);
    if (serverEnvIsProduction()) throw error;
  }
}

/**
 * Creates a local email/password account and starts email verification.
 *
 * The sign-up flow:
 * 1. Safely reads the unknown request payload as an object.
 * 2. Normalizes the email, first name, and last name, and extracts the password.
 * 3. Rejects missing required fields or passwords that do not meet policy.
 * 4. Ensures the local users table has the columns needed for auth.
 * 5. Checks for an existing active account with the same normalized email.
 * 6. Re-sends verification for an existing unverified account, or rejects an
 * existing verified account.
 * 7. Hashes the submitted password with bcrypt before storage.
 * 8. Inserts the new user as unverified.
 * 9. Creates and stores a hashed email verification token, then emails the raw
 * verification link to the user.
 *
 * @param payload - Unknown request body expected to contain email, password,
 * firstName, and lastName.
 *
 * @returns A response-like object with a numeric status and public message or
 * validation/duplicate-account error.
 */
export async function signupUser(payload: unknown) {
  const data = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const email = normalizeEmail(data.email);
  const password = typeof data.password === "string" ? data.password : "";
  const firstName = normalizeName(data.firstName);
  const lastName = normalizeName(data.lastName);

  if (!email || !password || !firstName || !lastName) {
    return { status: 400, body: { error: "Email, password, first name, and last name are required" } };
  }
  if (!isStrongPassword(password)) return { status: 400, body: { error: PASSWORD_REQUIREMENTS_MESSAGE } };

  await ensureUsersTable();
  const existing = await findActiveUserForSignup(email);
  if (existing) {
    if (!existing.email_verified) {
      await issueEmailVerification(existing);
      return { status: 409, body: { error: "An account with this email already exists. We sent a new verification email." } };
    }
    return { status: 409, body: { error: "An account with this email already exists. Please sign in." } };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await insertLocalUser({ email, passwordHash, firstName, lastName });
  await issueEmailVerification(user);

  return {
    status: 201,
    body: {
      message: SIGNUP_SUCCESS_MESSAGE,
    },
  };
}

/**
 * Checks submitted credentials against the local user table.
 *
 * @param payload - Unknown request body or credentials object containing email and password.
 * @returns Response-like result for valid credentials, missing input, invalid credentials, or unverified email.
 */
export async function checkCredentialsInDb(payload: unknown) {
  const data = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const email = normalizeEmail(data.email);
  const password = typeof data.password === "string" ? data.password : "";
  if (!email || !password) return { status: 400, body: { error: "Email and password are required" } };

  await ensureUsersTable();
  const user = await findUserForCredentials(email);
  if (!user || !await bcrypt.compare(password, text(user.password_hash))) {
    return { status: 401, body: { error: "Invalid credentials" } };
  }

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

/**
 * Verifies an email confirmation link by comparing the submitted token with the stored hash.
 *
 * @param emailValue - Email value from the verification URL.
 * @param tokenValue - Raw token value from the verification URL.
 * @returns Response-like result for success, already-verified email, or invalid links.
 */
export async function verifyEmailToken(emailValue: unknown, tokenValue: unknown) {
  const email = normalizeEmail(emailValue);
  const token = text(tokenValue);
  if (!email || !token) return { status: 400, body: { error: "Email and token are required." } };

  await ensureUsersTable();
  const user = await findUserForEmailVerification(email);
  if (!user) return { status: 400, body: { error: "Invalid or expired verification link." } };
  if (user.email_verified) return { status: 200, body: { message: "Your email is already verified. You can sign in." } };

  const expiresAt = user.email_verification_expires ? new Date(String(user.email_verification_expires)) : null;
  const isExpired = !expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now();
  if (text(user.email_verification_token) !== hashToken(token) || isExpired) {
    if (isExpired) await clearEmailVerificationToken(Number(user.id));
    return { status: 400, body: { error: "Invalid or expired verification link." } };
  }

  await markUserEmailVerified(Number(user.id));
  return { status: 200, body: { message: "Email verified successfully. You can now sign in." } };
}

/**
 * Sends a new verification email for an existing unverified account.
 *
 * @param payload - Unknown request body expected to contain an email.
 * @returns Response-like result that avoids revealing whether an unknown email exists.
 */
export async function resendVerificationEmail(payload: unknown) {
  const data = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const email = normalizeEmail(data.email);
  if (!email) return { status: 400, body: { error: "Email is required." } };

  await ensureUsersTable();
  const user = await findUserForVerificationResend(email);
  if (!user) return { status: 200, body: { message: "If that account exists, a verification email has been sent." } };
  if (user.email_verified) return { status: 400, body: { error: "This email is already verified. Please sign in." } };

  await issueEmailVerification(user);
  return { status: 200, body: { message: "Verification email sent." } };
}

/**
 * Starts the password reset flow without revealing whether the email exists.
 *
 * @param payload - Unknown request body expected to contain an email.
 * @returns Public password-reset response message.
 */
export async function requestPasswordReset(payload: unknown) {
  const data = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const email = normalizeEmail(data.email);
  if (!email) return { status: 400, body: { error: "A valid email is required." } };

  await ensureUsersTable();
  const user = await findUserForPasswordResetRequest(email);
  if (user) await issuePasswordReset(user);
  return { status: 200, body: { message: PASSWORD_RESET_REQUEST_MESSAGE } };
}

/**
 * Completes password reset by validating the token and saving a new password hash.
 *
 * @param payload - Unknown request body expected to contain email, token, and password.
 * @returns Response-like result for success, validation errors, or invalid reset links.
 */
export async function resetPassword(payload: unknown) {
  const data = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const email = normalizeEmail(data.email);
  const token = text(data.token);
  const password = typeof data.password === "string" ? data.password : "";
  if (!email || !token || !password) return { status: 400, body: { error: "Email, token, and password are required." } };
  if (!isStrongPassword(password)) return { status: 400, body: { error: PASSWORD_REQUIREMENTS_MESSAGE } };

  await ensureUsersTable();
  const user = await findUserForPasswordReset(email);
  if (!user) return { status: 400, body: { error: "Invalid or expired reset link." } };

  const expiresAt = user.password_reset_expires ? new Date(String(user.password_reset_expires)) : null;
  const isExpired = !expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now();
  if (text(user.password_reset_token) !== hashToken(token) || isExpired) {
    if (isExpired) await clearPasswordResetToken(Number(user.id));
    return { status: 400, body: { error: "Invalid or expired reset link." } };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await saveResetPassword(Number(user.id), passwordHash);
  return { status: 200, body: { message: "Your password has been reset. You can now sign in." } };
}
