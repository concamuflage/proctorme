import pool from "@/lib/server/database/pool";

export type PersistedCartItem = {
  id: string;
  name: string;
  price: number;
  sessionHours: number | null;
  startIso: string | null;
  endIso: string | null;
  bookingAddressStreet: string | null;
  bookingAddressCity: string | null;
  bookingAddressState: string | null;
  bookingAddressZip: string | null;
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
  sessionHours?: number | null;
  startIso?: string | null;
  endIso?: string | null;
  bookingAddressStreet?: string | null;
  bookingAddressCity?: string | null;
  bookingAddressState?: string | null;
  bookingAddressZip?: string | null;
  size?: string | null;
};

type SaveCartSelection = {
  shippingAddressId?: number | null;
  billingAddressId?: number | null;
  shippingId?: number | null;
};

type CartRow = {
  cart_item_id: unknown;
  quantity: unknown;
  session_hours: unknown;
  start_time_utc: unknown;
  end_time_utc: unknown;
  session_label: unknown;
  address_id: unknown;
  proctor_user_id: unknown;
  hourly_rate: unknown;
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

type ProctorCartItem = {
  cartItemId: string;
  proctorUserId: number;
  qty: number;
  sessionHours: number;
  startIso: string | null;
  endIso: string | null;
  sessionLabel: string | null;
  bookingAddressStreet: string | null;
  bookingAddressCity: string | null;
  bookingAddressState: string | null;
  bookingAddressZip: string | null;
};

type BookingAddressResolution = {
  addressId: number;
  street: string;
  city: string;
  state: string;
  zipCode: string;
};

/**
 * Converts a value to number.
 *
 * @param value - Input used by to number.
 *
 * @returns The result used by the surrounding flow.
 */
function toNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value);
}

/**
 * Runs the positive number logic for this module.
 *
 * @param value - Input used by positive number.
 * @param fallback - Input used by positive number.
 *
 * @returns The result used by the surrounding flow.
 */
function positiveNumber(value: unknown, fallback: number) {
  const parsed = value == null ? NaN : toNumber(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Runs the round money logic for this module.
 *
 * @param value - Input used by round money.
 *
 * @returns The result used by the surrounding flow.
 */
function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

/**
 * Runs the date to iso logic for this module.
 *
 * @param value - Input used by date to iso.
 *
 * @returns The result used by the surrounding flow.
 */
function dateToIso(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Parses proctor user id from an external value.
 *
 * @param cartItemId - Input used by parse proctor user id.
 *
 * @returns The parsed value, or null when parsing fails.
 */
function parseProctorUserId(cartItemId: string) {
  const [, proctorUserIdText] = cartItemId.split("-");
  const proctorUserId = Number(proctorUserIdText);
  return Number.isInteger(proctorUserId) && proctorUserId > 0 ? proctorUserId : null;
}

/**
 * Requires d text before allowing this flow to continue.
 *
 * @param value - Input used by required text.
 *
 * @returns The result used by the surrounding flow.
 */
function requiredText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Normalizes comparable into the shape this flow expects.
 *
 * @param value - Input used by normalize comparable.
 *
 * @returns The normalized value.
 */
function normalizeComparable(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Formats name for display.
 *
 * @param row - Input used by format name.
 *
 * @returns The formatted display value.
 */
function formatName(row: Pick<CartRow, "first_name" | "last_name">) {
  return [row.first_name, row.last_name]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean)
    .join(" ");
}

/**
 * Formats address for display.
 *
 * @param row - Input used by format address.
 *
 * @returns The formatted display value.
 */
function formatAddress(row: Pick<CartRow, "address_street" | "address_city" | "address_state" | "address_zip_code">) {
  return [row.address_street, row.address_city, row.address_state, row.address_zip_code]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean)
    .join(", ");
}

/**
 * Resolves booking address from the available session or request context.
 *
 * @param client - Input used by resolve booking address.
 * @param item - Input used by resolve booking address.
 *
 * @returns The result used by the surrounding flow.
 */
async function resolveBookingAddress(client: { query: (text: string, params?: unknown[]) => Promise<{ rows: any[] }> }, item: ProctorCartItem): Promise<BookingAddressResolution> {
  const street = requiredText(item.bookingAddressStreet);
  const city = requiredText(item.bookingAddressCity);
  const state = requiredText(item.bookingAddressState);
  const zipCode = requiredText(item.bookingAddressZip);

  if (!street || !city || !state || !zipCode) {
    throw new Error("Booking address is required before checkout.");
  }

  const proctorAddressResult = await client.query(
    `
      SELECT
        pa.city_id,
        pa.state_id,
        COALESCE(pa.country_id, ps.country_id) AS country_id,
        pc.name AS city_name,
        ps.name AS state_name,
        ps.code AS state_code
      FROM users u
      JOIN user_roles ur
        ON ur.user_id = u.id
      JOIN roles r
        ON r.id = ur.role_id
      LEFT JOIN addresses pa
        ON pa.id = u.proctor_address_id
      LEFT JOIN cities pc
        ON pc.id = pa.city_id
      LEFT JOIN states ps
        ON ps.id = pa.state_id
      WHERE u.id = $1
        AND r.name = 'proctor'
        AND u.deleted_at IS NULL
      LIMIT 1
    `,
    [item.proctorUserId]
  );

  const proctorAddress = proctorAddressResult.rows[0];
  if (!proctorAddress?.city_id || !proctorAddress?.state_id) {
    throw new Error("The selected proctor does not have a service city configured.");
  }

  const proctorCity = String(proctorAddress.city_name ?? "");
  const proctorStateCode = String(proctorAddress.state_code ?? "");
  const proctorStateName = String(proctorAddress.state_name ?? "");

  if (normalizeComparable(city) !== normalizeComparable(proctorCity)) {
    throw new Error(`Booking address must be in ${proctorCity}.`);
  }

  const normalizedState = normalizeComparable(state);
  if (
    normalizedState !== normalizeComparable(proctorStateCode) &&
    normalizedState !== normalizeComparable(proctorStateName)
  ) {
    throw new Error(`Booking address must be in ${proctorStateCode}.`);
  }

  const existingAddressResult = await client.query(
    `
      SELECT id
      FROM addresses
      WHERE LOWER(TRIM(street)) = LOWER(TRIM($1))
        AND city_id = $2
        AND state_id = $3
        AND COALESCE(zip_code, '') = $4
      ORDER BY id ASC
      LIMIT 1
    `,
    [street, proctorAddress.city_id, proctorAddress.state_id, zipCode]
  );

  const existingAddressId = existingAddressResult.rows[0]?.id;
  if (existingAddressId != null) {
    return {
      addressId: toNumber(existingAddressId),
      street,
      city: proctorCity,
      state: proctorStateCode,
      zipCode,
    };
  }

  const insertedAddressResult = await client.query(
    `
      INSERT INTO addresses (street, zip_code, country_id, city_id, state_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `,
    [street, zipCode, proctorAddress.country_id ?? null, proctorAddress.city_id, proctorAddress.state_id]
  );

  return {
    addressId: toNumber(insertedAddressResult.rows[0].id),
    street,
    city: proctorCity,
    state: proctorStateCode,
    zipCode,
  };
}

/**
 * Runs the ensure cart tables logic for this module.
 *
 * @returns The result used by the surrounding flow.
 */
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
      cart_item_id TEXT,
      proctor_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      address_id INTEGER REFERENCES addresses(id),
      session_hours NUMERIC(8,2) NOT NULL DEFAULT 1,
      start_time_utc TIMESTAMPTZ,
      end_time_utc TIMESTAMPTZ,
      session_label TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (cart_id, proctor_user_id)
    )`
  );
  await pool.query("ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS cart_item_id TEXT");
  await pool.query("ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS address_id INTEGER REFERENCES addresses(id)");
  await pool.query("ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS session_hours NUMERIC(8,2) NOT NULL DEFAULT 1");
  await pool.query("ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS start_time_utc TIMESTAMPTZ");
  await pool.query("ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS end_time_utc TIMESTAMPTZ");
  await pool.query("ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS session_label TEXT");
  await pool.query("UPDATE cart_items SET cart_item_id = CONCAT('proctor-', proctor_user_id) WHERE cart_item_id IS NULL");
  await pool.query("ALTER TABLE cart_items ALTER COLUMN cart_item_id SET NOT NULL");
  await pool.query(
    `
      DO $$
      DECLARE
        current_key text[];
      BEGIN
        SELECT array_agg(a.attname ORDER BY keys.ordinality)
          INTO current_key
        FROM pg_constraint c
        CROSS JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS keys(attnum, ordinality)
        JOIN pg_attribute a
          ON a.attrelid = c.conrelid
         AND a.attnum = keys.attnum
        WHERE c.conrelid = 'cart_items'::regclass
          AND c.conname = 'cart_items_pkey'
          AND c.contype = 'p';

        DELETE FROM cart_items a
        USING cart_items b
        WHERE a.cart_id = b.cart_id
          AND a.proctor_user_id = b.proctor_user_id
          AND a.ctid < b.ctid;

        IF current_key IS DISTINCT FROM ARRAY['cart_id', 'proctor_user_id'] THEN
          ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_pkey;
          ALTER TABLE cart_items ADD CONSTRAINT cart_items_pkey PRIMARY KEY (cart_id, proctor_user_id);
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'cart_items_pkey'
            AND conrelid = 'cart_items'::regclass
        ) THEN
          ALTER TABLE cart_items ADD CONSTRAINT cart_items_pkey PRIMARY KEY (cart_id, proctor_user_id);
        END IF;
      END
      $$;
    `
  );
}

/**
 * Gets cart for this flow.
 *
 * @param userId - Input used by get cart.
 *
 * @returns The result used by the surrounding flow.
 */
export async function getCart(userId: number): Promise<PersistedCart> {
  await ensureCartTables();

  const result = await pool.query<CartRow>(
    `
      SELECT
        cart_item.cart_item_id,
        cart_item.quantity,
        cart_item.session_hours,
        cart_item.start_time_utc,
        cart_item.end_time_utc,
        cart_item.session_label,
        cart_item.address_id,
        u.id AS proctor_user_id,
        COALESCE(u.hourly_rate, 0) AS hourly_rate,
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
        ON a.id = COALESCE(cart_item.address_id, u.proctor_address_id)
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
      id: typeof row.cart_item_id === "string" && row.cart_item_id ? row.cart_item_id : `proctor-${toNumber(row.proctor_user_id)}`,
      name: formatName(row),
      price: roundMoney(toNumber(row.hourly_rate) * positiveNumber(row.session_hours, 1)),
      sessionHours: positiveNumber(row.session_hours, 1),
      startIso: dateToIso(row.start_time_utc),
      endIso: dateToIso(row.end_time_utc),
      bookingAddressStreet: typeof row.address_street === "string" ? row.address_street : null,
      bookingAddressCity: typeof row.address_city === "string" ? row.address_city : null,
      bookingAddressState: typeof row.address_state === "string" ? row.address_state : null,
      bookingAddressZip: typeof row.address_zip_code === "string" ? row.address_zip_code : null,
      imageUrl: null,
      color: formatAddress(row) || null,
      size: typeof row.session_label === "string" && row.session_label ? row.session_label : row.session_window ? String(row.session_window) : null,
      qty: toNumber(row.quantity),
    }));

  return {
    items,
    shippingAddressId: null,
    billingAddressId: null,
    shippingId: null,
  };
}

/**
 * Runs the save cart logic for this module.
 *
 * @param userId - Input used by save cart.
 * @param items - Input used by save cart.
 * @param _selections - Input used by save cart.
 *
 * @returns The result used by the surrounding flow.
 */
export async function saveCart(userId: number, items: SaveCartItem[], _selections?: SaveCartSelection) {
  await ensureCartTables();

  const proctorItemsById = new Map<number, ProctorCartItem>();
  let hasInvalidItem = false;
  for (const item of items) {
    const proctorUserId = parseProctorUserId(item.id);
    const qty = Number(item.qty);
    const sessionHours = positiveNumber(item.sessionHours, 1);
    if (proctorUserId == null || !Number.isInteger(qty) || qty <= 0) {
      hasInvalidItem = true;
      continue;
    }
    proctorItemsById.set(proctorUserId, {
      cartItemId: item.id,
      proctorUserId,
      qty,
      sessionHours,
      startIso: item.startIso ?? null,
      endIso: item.endIso ?? null,
      sessionLabel: item.size ?? null,
      bookingAddressStreet: item.bookingAddressStreet ?? null,
      bookingAddressCity: item.bookingAddressCity ?? null,
      bookingAddressState: item.bookingAddressState ?? null,
      bookingAddressZip: item.bookingAddressZip ?? null,
    });
  }

  const proctorItems = Array.from(proctorItemsById.values());

  if (hasInvalidItem) {
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
          JOIN user_roles ur
            ON ur.user_id = u.id
          JOIN roles r
            ON r.id = ur.role_id
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
      const bookingAddress = await resolveBookingAddress(client, item);
      await client.query(
        `
          INSERT INTO cart_items (
            cart_id,
            cart_item_id,
            proctor_user_id,
            quantity,
            address_id,
            session_hours,
            start_time_utc,
            end_time_utc,
            session_label,
            created_at,
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz, $8::timestamptz, $9, NOW(), NOW())
        `,
        [
          cartId,
          item.cartItemId,
          item.proctorUserId,
          item.qty,
          bookingAddress.addressId,
          item.sessionHours,
          item.startIso,
          item.endIso,
          item.sessionLabel,
        ]
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
