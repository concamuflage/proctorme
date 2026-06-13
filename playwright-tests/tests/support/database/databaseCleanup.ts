import { testDbPool } from "./databasePool";

/**
 * Deletes a test user by email.
 *
 * @param email - Email address to remove from the users table.
 *
 * @returns Promise that resolves when cleanup is complete.
 */
export async function deleteUserByEmail(email: string | null | undefined) {
  if (!email?.trim()) return;

  const client = await testDbPool.connect();

  try {
    await client.query("DELETE FROM users WHERE lower(email) = lower($1)", [email.trim()]);
  } finally {
    client.release();
  }
}
