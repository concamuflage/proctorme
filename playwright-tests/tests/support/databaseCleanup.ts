import { endTestDbPool, testDbPool } from "./databasePool";

/**
 * Runs the delete user by email logic for this module.
 *
 * @param email - Input used by delete user by email.
 *
 * @returns The result used by the surrounding flow.
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

