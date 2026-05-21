import pool from "@/backend/database/pool";

export type PersistedCartItem = {
  id: string;
  name: string;
  price: number;
  weightKg: number | null;
  imageUrl: string | null;
  color: string | null;
  size: string | null;
  qty: number;
};

export type PersistedCart = {
  items: PersistedCartItem[];
  shippingAddressId: number | null;
  billingAddressId: number | null;
  shippingId: number | null;
};

type SaveCartItem = {
  id: string;
  qty: number;
};

type SaveCartSelection = {
  shippingAddressId?: number | null;
  billingAddressId?: number | null;
  shippingId?: number | null;
};

type CartRow = {
  quantity: unknown;
  proctor_user_id: unknown;
  booking_rate_usd: unknown;
  first_name: unknown;
  last_name: unknown;
  address_street: unknown;
  address_city: unknown;
  address_state: unknown;
  address_zip_code: unknown;
  session_window: unknown;
};

type ProctorExistenceRow = {
  id: unknown;
};

function toNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value);
}

function parseProctorUserId(cartItemId: string) {
  const [, proctorUserIdText] = cartItemId.split("-");
  const proctorUserId = Number(proctorUserIdText);
  return Number.isInteger(proctorUserId) && proctorUserId > 0 ? proctorUserId : null;
}

function formatName(row: Pick<CartRow, "first_name" | "last_name">) {
  return [row.first_name, row.last_name]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean)
    .join(" ");
}

function formatAddress(row: Pick<CartRow, "address_street" | "address_city" | "address_state" | "address_zip_code">) {
  return [row.address_street, row.address_city, row.address_state, row.address_zip_code]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean)
    .join(", ");
}

async function ensureCartTables() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS carts (
      id BIGSERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`
  );

  await pool.query(
    `CREATE TABLE IF NOT EXISTS cart_items (
      cart_id BIGINT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
      proctor_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (cart_id, proctor_user_id)
    )`
  );
}

export async function getCart(userId: number): Promise<PersistedCart> {
  await ensureCartTables();

  const result = await pool.query<CartRow>(
    `
      SELECT
        cart_item.quantity,
        u.id AS proctor_user_id,
        COALESCE(u.hourly_rate, 0) * COALESCE(u.minimum_hours, 1) AS booking_rate_usd,
        u.first_name,
        u.last_name,
        a.street AS address_street,
        city.name AS address_city,
        s.code AS address_state,
        a.zip_code AS address_zip_code,
        CASE
          WHEN COALESCE(u.minimum_hours, 1) = COALESCE(u.maximum_hours, COALESCE(u.minimum_hours, 1))
            THEN CONCAT(COALESCE(u.minimum_hours, 1), ' hr')
          ELSE CONCAT(COALESCE(u.minimum_hours, 1), '-', COALESCE(u.maximum_hours, COALESCE(u.minimum_hours, 1)), ' hr')
        END AS session_window
      FROM carts cts
      LEFT JOIN cart_items cart_item
        ON cart_item.cart_id = cts.id
      LEFT JOIN users u
        ON u.id = cart_item.proctor_user_id
      LEFT JOIN addresses a
        ON a.id = u.proctor_address_id
      LEFT JOIN cities city
        ON city.id = a.city_id
      LEFT JOIN states s
        ON s.id = a.state_id
      WHERE cts.user_id = $1
      ORDER BY cart_item.created_at ASC NULLS LAST, u.id ASC NULLS LAST
    `,
    [userId]
  );

  const items = result.rows
    .filter((row: CartRow) => row.proctor_user_id != null)
    .map((row: CartRow) => ({
      id: `proctor-${toNumber(row.proctor_user_id)}`,
      name: formatName(row),
      price: row.booking_rate_usd == null ? 0 : toNumber(row.booking_rate_usd),
      weightKg: 1,
      imageUrl: null,
      color: formatAddress(row) || null,
      size: row.session_window ? String(row.session_window) : null,
      qty: toNumber(row.quantity),
    }));

  return {
    items,
    shippingAddressId: null,
    billingAddressId: null,
    shippingId: null,
  };
}

export async function saveCart(userId: number, items: SaveCartItem[], _selections?: SaveCartSelection) {
  await ensureCartTables();

  const proctorItems = items.map((item) => ({
    proctorUserId: parseProctorUserId(item.id),
    qty: Number(item.qty),
  }));

  if (proctorItems.some((item) => item.proctorUserId == null || !Number.isInteger(item.qty) || item.qty <= 0)) {
    throw new Error("Invalid cart items.");
  }

  const proctorUserIds = proctorItems
    .map((item) => item.proctorUserId)
    .filter((proctorUserId): proctorUserId is number => proctorUserId != null);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const cartResult = await client.query(
      `
        INSERT INTO carts (user_id, updated_at)
        VALUES ($1, NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET
          updated_at = NOW()
        RETURNING id
      `,
      [userId]
    );

    const cartId = toNumber(cartResult.rows[0].id);

    if (proctorUserIds.length > 0) {
      const existingProctors = await client.query<ProctorExistenceRow>(
        `
          SELECT u.id
          FROM users u
          JOIN roles r
            ON r.id = u.role_id
          WHERE u.id = ANY($1::int[])
            AND r.name = 'proctor'
            AND u.deleted_at IS NULL
        `,
        [proctorUserIds]
      );

      const existingProctorIds = new Set(
        existingProctors.rows.map((row: ProctorExistenceRow) => toNumber(row.id))
      );
      if (proctorUserIds.some((proctorUserId) => !existingProctorIds.has(proctorUserId))) {
        throw new Error("One or more cart items no longer exist.");
      }
    }

    await client.query("DELETE FROM cart_items WHERE cart_id = $1", [cartId]);

    for (const item of proctorItems) {
      await client.query(
        `
          INSERT INTO cart_items (cart_id, proctor_user_id, quantity, created_at, updated_at)
          VALUES ($1, $2, $3, NOW(), NOW())
        `,
        [cartId, item.proctorUserId, item.qty]
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
