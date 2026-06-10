import { testDbPool } from "../../../support/databasePool";

/**
 * Runs the user verification status logic for this module.
 *
 * @param email - Input used by user verification status.
 *
 * @returns The result used by the surrounding flow.
 */
export async function userVerificationStatus(email: string) {
  const result = await testDbPool.query<{ email_verified: boolean }>(
    "SELECT email_verified FROM users WHERE lower(email) = lower($1) AND deleted_at IS NULL",
    [email]
  );

  return result.rows[0]?.email_verified;
}

/**
 * Runs the mark user email verified logic for this module.
 *
 * @param email - Input used by mark user email verified.
 *
 * @returns The result used by the surrounding flow.
 */
export async function markUserEmailVerified(email: string) {
  await testDbPool.query(
    "UPDATE users SET email_verified = TRUE WHERE lower(email) = lower($1) AND deleted_at IS NULL",
    [email]
  );
}
