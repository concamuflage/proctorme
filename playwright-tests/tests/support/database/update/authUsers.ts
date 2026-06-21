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

/**
 * Removes every role assigned to an active auth user for no-role test setup.
 *
 * @param email - Email address whose roles should be removed.
 *
 * @returns Promise that resolves when the role cleanup completes.
 */
export async function deleteUserRolesByEmail(email: string) {
  await testDbPool.query(
    `
      DELETE FROM user_roles
      WHERE user_id IN (
        SELECT id
        FROM users
        WHERE lower(email) = lower($1)
          AND deleted_at IS NULL
      )
    `,
    [email]
  );
}
