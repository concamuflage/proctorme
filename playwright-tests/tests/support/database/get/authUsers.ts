import { testDbPool } from "../databasePool";

export type AuthUserRecord = {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  email_verified: boolean;
  has_verification_token: boolean;
};

/**
 * Finds the active auth user row for auth API assertions.
 *
 * @param email - Email address submitted during signup.
 *
 * @returns The stored auth user record, if present.
 */
export async function findAuthUserByEmail(email: string) {
  const result = await testDbPool.query<AuthUserRecord>(
    `
      SELECT
        id,
        email,
        first_name,
        last_name,
        email_verified,
        email_verification_token IS NOT NULL AS has_verification_token
      FROM users
      WHERE lower(email) = lower($1)
        AND deleted_at IS NULL
      LIMIT 1
    `,
    [email]
  );

  return result.rows[0] ?? null;
}
