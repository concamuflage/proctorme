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
  const measurementResult = await client.query(
    "SELECT measurement_id FROM user_measurement WHERE user_id = $1",
    [userId]
  );
  const addressResult = await client.query(
    "SELECT address_id FROM user_addresses WHERE user_id = $1",
    [userId]
  );

  const measurementIds = (measurementResult.rows as Array<{ measurement_id: unknown }>)
    .map((row) => Number(row.measurement_id));
  const addressIds = (addressResult.rows as Array<{ address_id: unknown }>)
    .map((row) => Number(row.address_id));

  await client.query("DELETE FROM carts WHERE user_id = $1", [userId]);
  await client.query("DELETE FROM user_measurement WHERE user_id = $1", [userId]);
  await client.query("DELETE FROM user_addresses WHERE user_id = $1", [userId]);

  if (measurementIds.length > 0) {
    await client.query(
      `
        DELETE FROM measurements m
        WHERE m.id = ANY($1::int[])
          AND NOT EXISTS (
            SELECT 1
            FROM user_measurement um
            WHERE um.measurement_id = m.id
          )
      `,
      [measurementIds]
    );
  }

  if (addressIds.length > 0) {
    await client.query(
      `
        DELETE FROM addresses a
        WHERE a.id = ANY($1::int[])
          AND NOT EXISTS (
            SELECT 1
            FROM user_addresses ua
            WHERE ua.address_id = a.id
          )
          AND NOT EXISTS (
            SELECT 1
            FROM carts c
            WHERE c.shipping_address_id = a.id
               OR c.billing_address_id = a.id
          )
          AND NOT EXISTS (
            SELECT 1
            FROM orders o
            WHERE o.shipping_address_id = a.id
               OR o.billing_address_id = a.id
          )
      `,
      [addressIds]
    );
  }
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
