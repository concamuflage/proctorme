import { endTestDbPool, testDbPool } from "./databasePool";

export async function deleteUserByEmail(email: string | null | undefined) {
  if (!email?.trim()) return;

  const client = await testDbPool.connect();

  try {
    await client.query("DELETE FROM users WHERE lower(email) = lower($1)", [email.trim()]);
  } finally {
    client.release();
  }
}

