import pool from "@/backend/database/pool";

type DeleteAccountMode = "hard" | "soft";
type QueryableClient = {
  query: typeof pool.query;
};

async function ensureAccountDeletionColumns() {
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE");
  await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_email TEXT");
}

async function hasRetainedRecords(client: QueryableClient, userId: number) {
  const result = await client.query(
    `
      SELECT
        CASE
          WHEN to_regclass('public.orders') IS NULL THEN FALSE
          ELSE EXISTS (
            SELECT 1
            FROM orders
            WHERE user_id = $1
            LIMIT 1
          )
        END AS has_orders
    `,
    [userId]
  );

  return result.rows[0]?.has_orders === true;
}

async function deleteEphemeralAccountData(client: QueryableClient, userId: number) {
  await client.query("DELETE FROM carts WHERE user_id = $1", [userId]);
}

async function softDeleteUser(client: QueryableClient, userId: number) {
  await client.query(
    `
      UPDATE users
      SET
        deleted_at = NOW(),
        deleted_email = email,
        email = CONCAT('deleted-user-', id, '-', EXTRACT(EPOCH FROM NOW())::bigint, '@deleted.local'),
        password_hash = CONCAT('deleted:', id, ':', EXTRACT(EPOCH FROM NOW())::bigint),
        first_name = NULL,
        last_name = NULL,
        email_verified = FALSE,
        email_verification_token = NULL,
        email_verification_expires = NULL,
        password_reset_token = NULL,
        password_reset_expires = NULL
      WHERE id = $1
        AND deleted_at IS NULL
    `,
    [userId]
  );
}

async function hardDeleteUser(client: QueryableClient, userId: number) {
  await client.query("DELETE FROM stripe_checkout_sessions WHERE user_id = $1 AND order_id IS NULL", [userId]);
  await client.query("DELETE FROM users WHERE id = $1", [userId]);
}

export async function deleteCurrentUserAccount(userId: number): Promise<{ mode: DeleteAccountMode }> {
  await ensureAccountDeletionColumns();

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const retainedRecords = await hasRetainedRecords(client, userId);
    const mode: DeleteAccountMode = process.env.NODE_ENV === "production" || retainedRecords ? "soft" : "hard";

    await deleteEphemeralAccountData(client, userId);

    if (mode === "soft") {
      await softDeleteUser(client, userId);
    } else {
      await hardDeleteUser(client, userId);
    }

    await client.query("COMMIT");
    return { mode };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
