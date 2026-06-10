import pool from "@/lib/server/database/pool";

/**
 * Checks whether user email verified is true for this flow.
 *
 * @param userId - Input used by is user email verified.
 *
 * @returns True when the value satisfies the check.
 */
export async function isUserEmailVerified(userId: string) {
  const numericUserId = Number(userId);
  if (!Number.isInteger(numericUserId) || numericUserId <= 0) {
    return false;
  }

  const result = await pool.query(
    `
      SELECT email_verified
      FROM users
      WHERE id = $1
        AND deleted_at IS NULL
    `,
    [numericUserId]
  );

  return result.rows[0]?.email_verified === true;
}
