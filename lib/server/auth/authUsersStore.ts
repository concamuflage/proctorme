import pool from "@/lib/server/database/pool";

export type UserRow = {
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

/**
 * Creates or updates the users table so local auth has the columns it needs.
 *
 * @returns Promise that resolves when the table and columns exist.
 */
export async function ensureUsersTable() {
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

/**
 * Finds an active user by normalized email for signup duplicate checks.
 *
 * @param email - Normalized email address.
 * @returns Existing active user row, if present.
 */
export async function findActiveUserForSignup(email: string) {
  const result = await pool.query<UserRow>(
    "SELECT id, email, first_name, email_verified FROM users WHERE email = $1 AND deleted_at IS NULL",
    [email]
  );
  return result.rows[0];
}

/**
 * Inserts user as unverified user in the database with a hashed password.
 *
 * @param user - Normalized user values and bcrypt password hash.
 * @returns Inserted user row.
 */
export async function insertLocalUser(user: {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
}) {
  const result = await pool.query<UserRow>(
    `
      INSERT INTO users (email, password_hash, first_name, last_name, email_verified, email_verification_token, email_verification_expires)
      VALUES ($1, $2, $3, $4, FALSE, NULL, NULL)
      RETURNING id, email, first_name, last_name
    `,
    [user.email, user.passwordHash, user.firstName, user.lastName]
  );
  return result.rows[0];
}

/**
 * Stores the hashed email verification token for a user.
 *
 * @param userId - User id to update.
 * @param hashedToken - Hashed verification token.
 * @param expiresAt - Verification token expiration.
 * @returns Promise that resolves when the row is updated.
 */
export async function saveEmailVerificationToken(userId: number, hashedToken: string, expiresAt: Date) {
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
}

/**
 * Finds an active user row needed for password credential checks.
 *
 * @param email - Normalized email address.
 * @returns User row with password hash and verification state, if present.
 */
export async function findUserForCredentials(email: string) {
  const result = await pool.query<UserRow>(
    `
      SELECT id, email, first_name, last_name, password_hash, email_verified
      FROM users
      WHERE email = $1
        AND deleted_at IS NULL
    `,
    [email]
  );
  return result.rows[0];
}

/**
 * Finds an active user row needed for email verification.
 *
 * @param email - Normalized email address.
 * @returns User row with email verification token state, if present.
 */
export async function findUserForEmailVerification(email: string) {
  const result = await pool.query<UserRow>(
    `
      SELECT id, email_verified, email_verification_token, email_verification_expires
      FROM users
      WHERE email = $1
        AND deleted_at IS NULL
    `,
    [email]
  );
  return result.rows[0];
}

/**
 * Clears the stored email verification token for a user.
 *
 * @param userId - User id to update.
 * @returns Promise that resolves when the row is updated.
 */
export async function clearEmailVerificationToken(userId: number) {
  await pool.query("UPDATE users SET email_verification_token = NULL, email_verification_expires = NULL WHERE id = $1", [userId]);
}

/**
 * Marks a user email verified and clears the one-time verification token.
 *
 * @param userId - User id to update.
 * @returns Promise that resolves when the row is updated.
 */
export async function markUserEmailVerified(userId: number) {
  await pool.query(
    "UPDATE users SET email_verified = TRUE, email_verification_token = NULL, email_verification_expires = NULL WHERE id = $1",
    [userId]
  );
}

/**
 * Finds an active user row needed for verification-email resends.
 *
 * @param email - Normalized email address.
 * @returns User row with email verification state, if present.
 */
export async function findUserForVerificationResend(email: string) {
  const result = await pool.query<UserRow>(
    "SELECT id, email, first_name, email_verified FROM users WHERE email = $1 AND deleted_at IS NULL",
    [email]
  );
  return result.rows[0];
}

/**
 * Finds an active user row needed for a password reset request.
 *
 * @param email - Normalized email address.
 * @returns User row with email and name, if present.
 */
export async function findUserForPasswordResetRequest(email: string) {
  const result = await pool.query<UserRow>(
    "SELECT id, email, first_name FROM users WHERE email = $1 AND deleted_at IS NULL LIMIT 1",
    [email]
  );
  return result.rows[0];
}

/**
 * Stores the hashed password reset token for a user.
 *
 * @param userId - User id to update.
 * @param hashedToken - Hashed reset token.
 * @param expiresAt - Reset token expiration.
 * @returns Promise that resolves when the row is updated.
 */
export async function savePasswordResetToken(userId: number, hashedToken: string, expiresAt: Date) {
  await pool.query(
    `
      UPDATE users
      SET password_reset_token = $2,
          password_reset_expires = $3
      WHERE id = $1
    `,
    [userId, hashedToken, expiresAt]
  );
}

/**
 * Finds an active user row needed to complete password reset.
 *
 * @param email - Normalized email address.
 * @returns User row with password reset token state, if present.
 */
export async function findUserForPasswordReset(email: string) {
  const result = await pool.query<UserRow>(
    "SELECT id, password_reset_token, password_reset_expires FROM users WHERE email = $1 AND deleted_at IS NULL LIMIT 1",
    [email]
  );
  return result.rows[0];
}

/**
 * Clears the stored password reset token for a user.
 *
 * @param userId - User id to update.
 * @returns Promise that resolves when the row is updated.
 */
export async function clearPasswordResetToken(userId: number) {
  await pool.query("UPDATE users SET password_reset_token = NULL, password_reset_expires = NULL WHERE id = $1", [userId]);
}

/**
 * Stores a new password hash and clears reset/verification tokens.
 *
 * @param userId - User id to update.
 * @param passwordHash - New bcrypt password hash.
 * @returns Promise that resolves when the row is updated.
 */
export async function saveResetPassword(userId: number, passwordHash: string) {
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
    [userId, passwordHash]
  );
}
