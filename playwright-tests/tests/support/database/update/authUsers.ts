import { testDbPool } from "../databasePool";

/**
 * Marks an active auth user's email as verified for test setup.
 *
 * @param email - Email address to mark verified.
 *
 * @returns Promise that resolves when the update completes.
 */
export async function markUserEmailVerified(email: string) {
  await testDbPool.query(
    "UPDATE users SET email_verified = TRUE WHERE lower(email) = lower($1) AND deleted_at IS NULL",
    [email]
  );
}
