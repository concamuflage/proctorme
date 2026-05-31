import pool from "@/lib/server/database/pool";
import { createInvoiceNumber } from "@/lib/invoice";
import { calculateBookingTotal, calculateServiceFee } from "@/lib/serviceFee";
import type Stripe from "stripe";

export type CheckoutOrderItem = {
  cartItemId: string;
  addressId?: number | null;
  quantity: number;
  unitPriceUsd: number;
  sessionHours?: number | null;
  startIso?: string | null;
  endIso?: string | null;
  name?: string;
  color?: string | null;
  size?: string | null;
};

export type CheckoutOrderPayload = {
  subtotalUsd: number;
  shippingUsd: number;
  totalUsd: number;
  clothesWeightKg: number;
  boxWeightKg: number;
  shippingWeightKg: number;
  shippingId: number;
  shippingAddressId: number;
  billingAddressId: number;
  items: CheckoutOrderItem[];
};

type ProctorExistenceRow = {
  id: unknown;
};

type ExistingOrderRow = {
  id: unknown;
  invoice_number: unknown;
  paid_at: unknown;
};

type DailyInvoiceSequenceRow = {
  sequence_number: unknown;
};

type StripeCheckoutSessionRow = {
  stripe_session_id: string;
  user_id: unknown;
  payload: unknown;
  order_id: unknown;
  completed_at: unknown;
};

type StripeWebhookEventRow = {
  id: unknown;
  processed_at: unknown;
  order_id: unknown;
};

type StripePaymentRow = {
  id: unknown;
  order_id: unknown;
  status: unknown;
  paid_at: unknown;
  failed_at: unknown;
};

type QueryClient = {
  query: typeof pool.query;
};

export type StripePaymentDiscountDetails = {
  stripePromotionCodeId: string | null;
  stripeCouponId: string | null;
  promotionCode: string | null;
  discountAmount: number | null;
  discountCurrency: string | null;
};

type CartCheckoutRow = {
  cart_item_id: unknown;
  address_id: unknown;
  quantity: unknown;
  session_hours: unknown;
  start_time_utc: unknown;
  end_time_utc: unknown;
  session_label: unknown;
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

function getUtcDayBounds(date: Date) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return { start, end };
}

export type StripeCheckoutOrderStatus =
  | {
      state: "completed";
      orderId: number;
      invoiceNumber: string | null;
      paidAt: string | null;
    }
  | {
      state: "pending";
      paymentStatus: string | null;
      checkoutStatus: string | null;
    }
  | {
      state: "failed";
      paymentStatus: string | null;
      errorMessage: string | null;
    }
  | {
      state: "not_found";
    };

function toNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value);
}

function positiveNumber(value: unknown, fallback: number) {
  const parsed = value == null ? NaN : toNumber(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function expectedStripeAmountCents(payload: CheckoutOrderPayload) {
  const itemsCents = payload.items.reduce(
    (total, item) => total + Math.round(Number(item.unitPriceUsd) * 100) * Number(item.quantity),
    0
  );
  return itemsCents + Math.round(Number(payload.shippingUsd) * 100);
}

export function assertStripePaymentMatchesCheckoutPayload({
  payload,
  checkoutSession,
  paymentIntent,
}: {
  payload: CheckoutOrderPayload;
  checkoutSession: Stripe.Checkout.Session;
  paymentIntent?: Stripe.PaymentIntent | null;
}) {
  const expectedAmount = expectedStripeAmountCents(payload);
  const sessionSubtotalAmount = checkoutSession.amount_subtotal ?? checkoutSession.amount_total;
  const finalStripeAmount = checkoutSession.amount_total;
  const receivedAmount = paymentIntent?.amount_received;
  const currency = String(paymentIntent?.currency ?? checkoutSession.currency ?? "").toLowerCase();

  if (currency !== "usd") {
    throw new Error("Stripe payment currency does not match the expected order currency.");
  }

  if (sessionSubtotalAmount !== expectedAmount) {
    throw new Error("Stripe checkout amount does not match the expected order total.");
  }

  if (finalStripeAmount == null) {
    throw new Error("Stripe checkout session is missing the paid total.");
  }

  if (receivedAmount != null && receivedAmount !== finalStripeAmount) {
    throw new Error("Stripe received amount does not match the checkout total.");
  }
}

export function parseProctorUserId(cartItemId: string) {
  const [, proctorUserIdText] = cartItemId.split("-");
  const proctorUserId = Number(proctorUserIdText);
  return Number.isInteger(proctorUserId) && proctorUserId > 0 ? proctorUserId : null;
}

function proctorName(row: Pick<CartCheckoutRow, "first_name" | "last_name">) {
  return [row.first_name, row.last_name]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean)
    .join(" ");
}

function proctorAddress(row: Pick<CartCheckoutRow, "address_street" | "address_city" | "address_state" | "address_zip_code">) {
  return [row.address_street, row.address_city, row.address_state, row.address_zip_code]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean)
    .join(", ");
}

function dateToIso(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  return typeof value === "string" && value.trim() ? new Date(value).toISOString() : null;
}

export function isValidCheckoutOrderPayload(payload: unknown): payload is CheckoutOrderPayload {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const candidate = payload as Record<string, unknown>;
  const numericFields = [
    "subtotalUsd",
    "shippingUsd",
    "totalUsd",
    "clothesWeightKg",
    "boxWeightKg",
    "shippingWeightKg",
  ];

  if (!numericFields.every((field) => Number.isFinite(toNumber(candidate[field])))) {
    return false;
  }

  if (!Array.isArray(candidate.items) || candidate.items.length === 0) {
    return false;
  }

  return candidate.items.every((item) => {
    if (!item || typeof item !== "object") return false;
    const typedItem = item as Record<string, unknown>;
    return (
      typeof typedItem.cartItemId === "string" &&
      typedItem.cartItemId.trim().length > 0 &&
      Number.isInteger(toNumber(typedItem.addressId)) &&
      toNumber(typedItem.addressId) > 0 &&
      Number.isInteger(toNumber(typedItem.quantity)) &&
      toNumber(typedItem.quantity) > 0 &&
      Number.isFinite(toNumber(typedItem.unitPriceUsd)) &&
      toNumber(typedItem.unitPriceUsd) >= 0 &&
      (typedItem.startIso == null || typeof typedItem.startIso === "string") &&
      (typedItem.endIso == null || typeof typedItem.endIso === "string")
    );
  });
}

async function withSchemaBootstrapLock<T>(callback: (client: QueryClient) => Promise<T>) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", ["proctorme-schema-bootstrap"]);
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function ensureOrderTables(client: QueryClient = pool) {
  await client.query(
    `CREATE TABLE IF NOT EXISTS orders (
      id BIGSERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      shipment_status TEXT NOT NULL DEFAULT 'unshipped',
      payment_status TEXT NOT NULL DEFAULT 'pending',
      payment_provider TEXT,
      payment_reference TEXT,
      paid_at TIMESTAMPTZ,
      currency_code TEXT NOT NULL DEFAULT 'USD',
      subtotal_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
      shipping_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
      total_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
      clothes_weight_kg NUMERIC(8,2),
      box_weight_kg NUMERIC(8,2),
      shipping_weight_kg NUMERIC(8,2),
      invoice_number TEXT,
      invoice_generated_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (payment_provider, payment_reference)
    )`
  );
  await client.query(
    `CREATE TABLE IF NOT EXISTS orders_proctors (
      id BIGSERIAL PRIMARY KEY,
      order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      proctor_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      booking_id BIGINT REFERENCES bookings(id) ON DELETE SET NULL,
      address_id INTEGER REFERENCES addresses(id),
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      snapshot_price NUMERIC(10,2) NOT NULL,
      session_hours NUMERIC(8,2),
      start_time_utc TIMESTAMPTZ,
      end_time_utc TIMESTAMPTZ,
      session_label TEXT
    )`
  );
  await client.query("ALTER TABLE orders_proctors ADD COLUMN IF NOT EXISTS booking_id BIGINT REFERENCES bookings(id) ON DELETE SET NULL");
  await client.query("ALTER TABLE orders_proctors ADD COLUMN IF NOT EXISTS address_id INTEGER REFERENCES addresses(id)");
  await client.query("ALTER TABLE orders_proctors ADD COLUMN IF NOT EXISTS session_hours NUMERIC(8,2)");
  await client.query("ALTER TABLE orders_proctors ADD COLUMN IF NOT EXISTS start_time_utc TIMESTAMPTZ");
  await client.query("ALTER TABLE orders_proctors ADD COLUMN IF NOT EXISTS end_time_utc TIMESTAMPTZ");
  await client.query("ALTER TABLE orders_proctors ADD COLUMN IF NOT EXISTS session_label TEXT");
  await client.query("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS address_id INTEGER REFERENCES addresses(id)");
}

export async function ensureStripeCheckoutSessionTable() {
  await withSchemaBootstrapLock(async (client) => {
    await ensureOrderTables(client);
    await client.query(
      `CREATE TABLE IF NOT EXISTS stripe_checkout_sessions (
        stripe_session_id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        payload JSONB NOT NULL,
        order_id BIGINT REFERENCES orders(id) ON DELETE SET NULL,
        completed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`
    );
  });
}

async function ensureStripeWebhookEventsTable() {
  await withSchemaBootstrapLock(async (client) => {
    await client.query(
      `CREATE TABLE IF NOT EXISTS stripe_webhook_events (
        id BIGSERIAL PRIMARY KEY,
        stripe_event_id TEXT UNIQUE NOT NULL,
        event_type TEXT NOT NULL,
        stripe_payment_intent_id TEXT,
        stripe_checkout_session_id TEXT,
        order_id BIGINT,
        raw_payload JSONB NOT NULL,
        processed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`
    );
  });
}

async function ensurePaymentsTable() {
  await withSchemaBootstrapLock(async (client) => {
    await client.query(
      `CREATE TABLE IF NOT EXISTS payments (
        id BIGSERIAL PRIMARY KEY,
        order_id BIGINT REFERENCES orders(id) ON DELETE SET NULL,
        stripe_payment_intent_id TEXT UNIQUE NOT NULL,
        stripe_checkout_session_id TEXT REFERENCES stripe_checkout_sessions(stripe_session_id),
        stripe_customer_id TEXT,
        stripe_charge_id TEXT,
        status TEXT NOT NULL,
        amount INTEGER NOT NULL,
        currency TEXT NOT NULL,
        customer_email TEXT,
        failure_code TEXT,
        failure_message TEXT,
        paid_at TIMESTAMPTZ,
        failed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`
    );
    await client.query("ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_promotion_code_id TEXT");
    await client.query("ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_coupon_id TEXT");
    await client.query("ALTER TABLE payments ADD COLUMN IF NOT EXISTS promotion_code TEXT");
    await client.query("ALTER TABLE payments ADD COLUMN IF NOT EXISTS discount_amount INTEGER");
    await client.query("ALTER TABLE payments ADD COLUMN IF NOT EXISTS discount_currency TEXT");
  });
}

function normalizeExpandableId<T extends { id?: string }>(value: string | T | null | undefined) {
  if (!value) return null;
  return typeof value === "string" ? value : value.id ?? null;
}

function readPromotionCodeValue(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const code = (value as { code?: unknown }).code;
  return typeof code === "string" && code.trim() ? code.trim() : null;
}

export function readStripePromotionCodeIdFromCheckoutSession(
  checkoutSession: Stripe.Checkout.Session
): string | null {
  const discounts = checkoutSession.total_details?.breakdown?.discounts ?? [];
  const promotionCode = discounts[0]?.discount?.promotion_code;
  return normalizeExpandableId(promotionCode);
}

export function readStripePaymentDiscountDetails(
  checkoutSession: Stripe.Checkout.Session,
  expandedPromotionCode?: Stripe.PromotionCode | null
): StripePaymentDiscountDetails {
  const discountAmount = checkoutSession.total_details?.amount_discount ?? 0;
  const discountCurrency =
    discountAmount > 0 ? String(checkoutSession.currency ?? "usd").toLowerCase() : null;
  const discounts = checkoutSession.total_details?.breakdown?.discounts ?? [];
  const firstDiscount = discounts[0]?.discount;
  const promotionCode = firstDiscount?.promotion_code;
  const coupon = firstDiscount?.coupon;
  const promotionCodeObject =
    typeof promotionCode === "object" && promotionCode ? promotionCode : expandedPromotionCode;

  return {
    stripePromotionCodeId: normalizeExpandableId(promotionCode),
    stripeCouponId: normalizeExpandableId(coupon),
    promotionCode: readPromotionCodeValue(promotionCodeObject),
    discountAmount: discountAmount > 0 ? discountAmount : null,
    discountCurrency,
  };
}

export async function saveStripeCheckoutSession(
  userId: number,
  stripeSessionId: string,
  payload: CheckoutOrderPayload
) {
  await ensureStripeCheckoutSessionTable();
  await pool.query(
    `
      INSERT INTO stripe_checkout_sessions (
        stripe_session_id,
        user_id,
        payload,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3::jsonb, NOW(), NOW())
      ON CONFLICT (stripe_session_id)
      DO UPDATE SET
        user_id = EXCLUDED.user_id,
        payload = EXCLUDED.payload,
        updated_at = NOW()
    `,
    [stripeSessionId, userId, JSON.stringify(payload)]
  );
}

export async function assertStripeCheckoutSessionRateLimit(userId: number) {
  await ensureStripeCheckoutSessionTable();
  const result = await pool.query(
    `
      SELECT COUNT(*)::int AS session_count
      FROM stripe_checkout_sessions
      WHERE user_id = $1
        AND created_at > NOW() - INTERVAL '5 minutes'
    `,
    [userId]
  );

  const sessionCount = Number(result.rows[0]?.session_count ?? 0);
  if (sessionCount >= 10) {
    throw new Error("Too many Stripe checkout attempts. Please wait a few minutes and try again.");
  }
}

export async function buildAuthoritativeCheckoutOrderPayload({
  userId,
}: {
  userId: number;
  shippingAddressId?: number | null;
  billingAddressId?: number | null;
  shippingId?: number | null;
}): Promise<CheckoutOrderPayload> {
  await ensureStripeCheckoutSessionTable();

  const cartResult = await pool.query<CartCheckoutRow>(
    `
      SELECT
        cart_item.cart_item_id,
        cart_item.address_id,
        cart_item.quantity,
        cart_item.session_hours,
        cart_item.start_time_utc,
        cart_item.end_time_utc,
        cart_item.session_label,
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
        ON a.id = cart_item.address_id
      LEFT JOIN cities city
        ON city.id = a.city_id
      LEFT JOIN states s
        ON s.id = a.state_id
      WHERE cts.user_id = $1
      ORDER BY cart_item.created_at ASC NULLS LAST, u.id ASC NULLS LAST
    `,
    [userId]
  );

  const cartItems: CartCheckoutRow[] = cartResult.rows.filter((row: CartCheckoutRow) => row.proctor_user_id != null);
  if (cartItems.length === 0) {
    throw new Error("Your cart is empty.");
  }

  if (cartItems.some((row) => row.address_id == null)) {
    throw new Error("Each booking must include an exact address before checkout.");
  }

  const items = cartItems.map((row: CartCheckoutRow) => ({
    cartItemId: typeof row.cart_item_id === "string" && row.cart_item_id ? row.cart_item_id : `proctor-${toNumber(row.proctor_user_id)}`,
    addressId: toNumber(row.address_id),
    quantity: toNumber(row.quantity),
    unitPriceUsd: roundMoney(toNumber(row.hourly_rate) * positiveNumber(row.session_hours, 1)),
    sessionHours: positiveNumber(row.session_hours, 1),
    startIso: dateToIso(row.start_time_utc),
    endIso: dateToIso(row.end_time_utc),
    name: proctorName(row),
    color: proctorAddress(row) || null,
    size: typeof row.session_label === "string" && row.session_label ? row.session_label : row.session_window == null ? null : String(row.session_window),
  }));

  for (const item of items) {
    const proctorUserId = parseProctorUserId(item.cartItemId);
    if (!proctorUserId || !item.startIso || !item.endIso) {
      throw new Error("Each booking must include a selected session time.");
    }

    const overlapResult = await pool.query(
      `
        SELECT 1
        FROM bookings b
        JOIN statuses s
          ON s.id = b.status_id
        WHERE b.user_id = $1
          AND s.name <> 'canceled'
          AND b.start_time_utc < $3::timestamptz
          AND b.end_time_utc > $2::timestamptz
        LIMIT 1
      `,
      [proctorUserId, item.startIso, item.endIso]
    );

    if (overlapResult.rows.length > 0) {
      throw new Error("This proctor already has a booking during the selected time.");
    }
  }

  const subtotalUsd = roundMoney(
    items.reduce((total: number, item: CheckoutOrderItem) => total + item.unitPriceUsd * item.quantity, 0)
  );
  const clothesWeightKg = cartItems.reduce(
    (total: number, row: CartCheckoutRow) => total + toNumber(row.quantity),
    0
  );
  const boxWeightKg = 0;
  const shippingWeightKg = clothesWeightKg;
  const shippingUsd = calculateServiceFee(subtotalUsd);

  return {
    subtotalUsd,
    shippingUsd,
    totalUsd: calculateBookingTotal(subtotalUsd),
    clothesWeightKg,
    boxWeightKg,
    shippingWeightKg,
    shippingId: 0,
    shippingAddressId: 0,
    billingAddressId: 0,
    items,
  };
}

export async function getStripeCheckoutSession(stripeSessionId: string, userId: number) {
  await ensureStripeCheckoutSessionTable();
  const result = await pool.query(
    `
      SELECT stripe_session_id, payload, order_id, completed_at
      FROM stripe_checkout_sessions
      WHERE stripe_session_id = $1
        AND user_id = $2
      LIMIT 1
    `,
    [stripeSessionId, userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0] as {
    stripe_session_id: string;
    payload: unknown;
    order_id: unknown;
    completed_at: unknown;
  };

  return {
    stripeSessionId: row.stripe_session_id,
    payload: row.payload,
    orderId: row.order_id == null ? null : Number(row.order_id),
    completedAt: row.completed_at == null ? null : new Date(String(row.completed_at)),
  };
}

export async function getStripeCheckoutSessionById(stripeSessionId: string) {
  await ensureStripeCheckoutSessionTable();
  const result = await pool.query<StripeCheckoutSessionRow>(
    `
      SELECT stripe_session_id, user_id, payload, order_id, completed_at
      FROM stripe_checkout_sessions
      WHERE stripe_session_id = $1
      LIMIT 1
    `,
    [stripeSessionId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    stripeSessionId: row.stripe_session_id,
    userId: row.user_id == null ? null : Number(row.user_id),
    payload: row.payload,
    orderId: row.order_id == null ? null : Number(row.order_id),
    completedAt: row.completed_at == null ? null : new Date(String(row.completed_at)),
  };
}

export async function createStripeWebhookEvent(
  stripeEventId: string,
  eventType: string,
  rawPayload: unknown,
  stripeCheckoutSessionId?: string | null,
  stripePaymentIntentId?: string | null
) {
  await ensureStripeWebhookEventsTable();
  const result = await pool.query<StripeWebhookEventRow>(
    `
      INSERT INTO stripe_webhook_events (
        stripe_event_id,
        event_type,
        stripe_payment_intent_id,
        stripe_checkout_session_id,
        raw_payload
      )
      VALUES ($1, $2, $3, $4, $5::jsonb)
      ON CONFLICT (stripe_event_id) DO NOTHING
      RETURNING id
    `,
    [
      stripeEventId,
      eventType,
      stripePaymentIntentId ?? null,
      stripeCheckoutSessionId ?? null,
      JSON.stringify(rawPayload),
    ]
  );

  if (result.rows.length === 0) {
    const existingResult = await pool.query<StripeWebhookEventRow>(
      `
        SELECT id, processed_at, order_id
        FROM stripe_webhook_events
        WHERE stripe_event_id = $1
        LIMIT 1
      `,
      [stripeEventId]
    );

    if (existingResult.rows.length === 0) {
      return {
        inserted: false,
        eventRowId: null,
        processedAt: null,
        orderId: null,
      };
    }

    const existingRow = existingResult.rows[0];
    return {
      inserted: false,
      eventRowId: Number(existingRow.id),
      processedAt:
        existingRow.processed_at == null ? null : new Date(String(existingRow.processed_at)),
      orderId: existingRow.order_id == null ? null : Number(existingRow.order_id),
    };
  }

  return {
    inserted: true,
    eventRowId: Number(result.rows[0].id),
    processedAt: null,
    orderId: null,
  };
}

export async function markStripeWebhookEventProcessed(
  stripeEventId: string,
  orderId?: number | null
) {
  await ensureStripeWebhookEventsTable();
  await pool.query(
    `
      UPDATE stripe_webhook_events
      SET order_id = COALESCE($2, order_id),
          processed_at = NOW()
      WHERE stripe_event_id = $1
    `,
    [stripeEventId, orderId ?? null]
  );
}

export async function upsertStripePaymentRecord({
  stripePaymentIntentId,
  stripeCheckoutSessionId,
  stripeCustomerId,
  stripeChargeId,
  status,
  amount,
  currency,
  customerEmail,
  failureCode,
  failureMessage,
  paidAt,
  failedAt,
  orderId,
  discountDetails,
}: {
  stripePaymentIntentId: string;
  stripeCheckoutSessionId?: string | null;
  stripeCustomerId?: string | null;
  stripeChargeId?: string | null;
  status: string;
  amount: number;
  currency: string;
  customerEmail?: string | null;
  failureCode?: string | null;
  failureMessage?: string | null;
  paidAt?: Date | null;
  failedAt?: Date | null;
  orderId?: number | null;
  discountDetails?: StripePaymentDiscountDetails | null;
}) {
  await ensurePaymentsTable();
  const result = await pool.query<StripePaymentRow>(
    `
      INSERT INTO payments (
        order_id,
        stripe_payment_intent_id,
        stripe_checkout_session_id,
        stripe_customer_id,
        stripe_charge_id,
        status,
        amount,
        currency,
        customer_email,
        failure_code,
        failure_message,
        paid_at,
        failed_at,
        stripe_promotion_code_id,
        stripe_coupon_id,
        promotion_code,
        discount_amount,
        discount_currency,
        created_at,
        updated_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11,
        $12,
        $13,
        $14,
        $15,
        $16,
        $17,
        $18,
        NOW(),
        NOW()
      )
      ON CONFLICT (stripe_payment_intent_id)
      DO UPDATE SET
        order_id = COALESCE(EXCLUDED.order_id, payments.order_id),
        stripe_checkout_session_id = COALESCE(EXCLUDED.stripe_checkout_session_id, payments.stripe_checkout_session_id),
        stripe_customer_id = COALESCE(EXCLUDED.stripe_customer_id, payments.stripe_customer_id),
        stripe_charge_id = COALESCE(EXCLUDED.stripe_charge_id, payments.stripe_charge_id),
        status = EXCLUDED.status,
        amount = EXCLUDED.amount,
        currency = EXCLUDED.currency,
        customer_email = COALESCE(EXCLUDED.customer_email, payments.customer_email),
        failure_code = EXCLUDED.failure_code,
        failure_message = EXCLUDED.failure_message,
        paid_at = COALESCE(EXCLUDED.paid_at, payments.paid_at),
        failed_at = COALESCE(EXCLUDED.failed_at, payments.failed_at),
        stripe_promotion_code_id = COALESCE(EXCLUDED.stripe_promotion_code_id, payments.stripe_promotion_code_id),
        stripe_coupon_id = COALESCE(EXCLUDED.stripe_coupon_id, payments.stripe_coupon_id),
        promotion_code = COALESCE(EXCLUDED.promotion_code, payments.promotion_code),
        discount_amount = COALESCE(EXCLUDED.discount_amount, payments.discount_amount),
        discount_currency = COALESCE(EXCLUDED.discount_currency, payments.discount_currency),
        updated_at = NOW()
      RETURNING id, order_id, status, paid_at, failed_at
    `,
    [
      orderId ?? null,
      stripePaymentIntentId,
      stripeCheckoutSessionId ?? null,
      stripeCustomerId ?? null,
      stripeChargeId ?? null,
      status,
      amount,
      currency,
      customerEmail ?? null,
      failureCode ?? null,
      failureMessage ?? null,
      paidAt ?? null,
      failedAt ?? null,
      discountDetails?.stripePromotionCodeId ?? null,
      discountDetails?.stripeCouponId ?? null,
      discountDetails?.promotionCode ?? null,
      discountDetails?.discountAmount ?? null,
      discountDetails?.discountCurrency ?? null,
    ]
  );

  const row = result.rows[0];
  return {
    id: Number(row.id),
    orderId: row.order_id == null ? null : Number(row.order_id),
    status: String(row.status),
    paidAt: row.paid_at == null ? null : new Date(String(row.paid_at)),
    failedAt: row.failed_at == null ? null : new Date(String(row.failed_at)),
  };
}

export async function getStripeCheckoutOrderStatus(userId: number, stripeSessionId: string): Promise<StripeCheckoutOrderStatus> {
  await ensureStripeCheckoutSessionTable();
  await ensurePaymentsTable();

  const result = await pool.query(
    `
      SELECT
        COALESCE(scs.order_id, p.order_id, o_ref.id) AS order_id,
        COALESCE(o.invoice_number, o_ref.invoice_number) AS invoice_number,
        COALESCE(o.paid_at, o_ref.paid_at) AS paid_at,
        p.status AS payment_status,
        p.failure_message
      FROM stripe_checkout_sessions scs
      LEFT JOIN payments p ON p.stripe_checkout_session_id = scs.stripe_session_id
      LEFT JOIN orders o ON o.id = COALESCE(scs.order_id, p.order_id)
      LEFT JOIN orders o_ref
        ON o_ref.payment_provider = 'stripe'
       AND o_ref.payment_reference = scs.stripe_session_id
      WHERE scs.stripe_session_id = $1
        AND scs.user_id = $2
      ORDER BY p.created_at DESC NULLS LAST
      LIMIT 1
    `,
    [stripeSessionId, userId]
  );

  if (result.rows.length === 0) {
    return { state: "not_found" };
  }

  const row = result.rows[0] as {
    order_id: unknown;
    invoice_number: unknown;
    paid_at: unknown;
    payment_status: unknown;
    failure_message: unknown;
  };

  if (row.order_id != null) {
    return {
      state: "completed",
      orderId: Number(row.order_id),
      invoiceNumber: row.invoice_number == null ? null : String(row.invoice_number),
      paidAt: row.paid_at == null ? null : new Date(String(row.paid_at)).toISOString(),
    };
  }

  const paymentStatus = row.payment_status == null ? null : String(row.payment_status);
  if (paymentStatus === "failed") {
    return {
      state: "failed",
      paymentStatus,
      errorMessage: row.failure_message == null ? null : String(row.failure_message),
    };
  }

  return {
    state: "pending",
    paymentStatus,
    checkoutStatus: paymentStatus === "paid" ? "complete" : null,
  };
}

function normalizeStripeId(value: string | Stripe.Customer | Stripe.DeletedCustomer | Stripe.Charge | null): string | null {
  if (!value) {
    return null;
  }

  return typeof value === "string" ? value : value.id;
}

export function readStripePaymentIntentId(
  value: string | Stripe.PaymentIntent | null
): string | null {
  if (!value) {
    return null;
  }

  return typeof value === "string" ? value : value.id;
}

export function readStripeChargeId(
  latestCharge: string | Stripe.Charge | null | undefined
): string | null {
  return normalizeStripeId(latestCharge ?? null);
}

export function readStripeCustomerId(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null
): string | null {
  return normalizeStripeId(customer);
}

export async function finalizePaidOrder({
  userId,
  payload,
  paymentProvider,
  paymentReference,
  paidAt,
}: {
  userId: number;
  payload: CheckoutOrderPayload;
  paymentProvider: string;
  paymentReference: string;
  paidAt: Date;
}) {
  await withSchemaBootstrapLock((client) => ensureOrderTables(client));
  const proctorItems = payload.items.map((item) => ({
    proctorUserId: parseProctorUserId(item.cartItemId),
    addressId: item.addressId == null ? null : Number(item.addressId),
    quantity: Number(item.quantity),
    unitPriceUsd: Number(item.unitPriceUsd),
    sessionHours: item.sessionHours == null ? null : Number(item.sessionHours),
    startIso: item.startIso ?? null,
    endIso: item.endIso ?? null,
    sessionLabel: item.size ?? null,
  }));

  if (proctorItems.some((item) => item.proctorUserId == null)) {
    throw new Error("Unable to determine one or more proctor ids.");
  }

  if (
    proctorItems.some(
      (item) =>
        item.addressId == null ||
        !Number.isFinite(item.addressId) ||
        !item.startIso ||
        !item.endIso ||
        item.sessionHours == null ||
        !Number.isFinite(item.sessionHours) ||
        item.sessionHours <= 0
    )
  ) {
    throw new Error("Every paid booking must include an address and session time.");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [paymentReference]);

    const existingOrderResult = await client.query<ExistingOrderRow>(
      `
        SELECT id, invoice_number, paid_at
        FROM orders
        WHERE payment_provider = $1
          AND payment_reference = $2
        LIMIT 1
      `,
      [paymentProvider, paymentReference]
    );

    if (existingOrderResult.rows.length > 0) {
      const existingOrder = existingOrderResult.rows[0];
      const sessionUpdateResult = await client.query(
        `
          UPDATE stripe_checkout_sessions
          SET order_id = $2,
              completed_at = COALESCE(completed_at, NOW()),
              updated_at = NOW()
          WHERE stripe_session_id = $1
        `,
        [paymentReference, Number(existingOrder.id)]
      );

      if (sessionUpdateResult.rowCount === 0) {
        throw new Error(
          `Missing persisted Stripe checkout session for ${paymentReference}.`
        );
      }
      await client.query("COMMIT");

      return {
        orderId: Number(existingOrder.id),
        invoiceNumber: String(existingOrder.invoice_number ?? ""),
        paidAt: new Date(String(existingOrder.paid_at)).toISOString(),
      };
    }

    const proctorUserIds = proctorItems
      .map((item) => item.proctorUserId)
      .filter((proctorUserId): proctorUserId is number => proctorUserId != null);

    const proctorExistenceResult = await client.query<ProctorExistenceRow>(
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

    const proctorIdsInDatabase = new Set(
      proctorExistenceResult.rows.map((row: ProctorExistenceRow) => Number(row.id))
    );

    if (proctorUserIds.some((proctorUserId) => !proctorIdsInDatabase.has(proctorUserId))) {
      throw new Error("One or more proctors no longer exist.");
    }

    const addressIds = proctorItems.map((item) => item.addressId).filter((addressId): addressId is number => addressId != null);
    const addressExistenceResult = await client.query<{ id: unknown }>(
      `
        SELECT id
        FROM addresses
        WHERE id = ANY($1::int[])
      `,
      [addressIds]
    );
    const addressIdsInDatabase = new Set(
      addressExistenceResult.rows.map((row: { id: unknown }) => Number(row.id))
    );
    if (addressIds.some((addressId) => !addressIdsInDatabase.has(addressId))) {
      throw new Error("One or more booking addresses no longer exist.");
    }

    const normalStatusResult = await client.query(
      `
        SELECT id
        FROM statuses
        WHERE name = 'normal'
        LIMIT 1
      `
    );
    const normalStatusId = normalStatusResult.rows[0]?.id == null ? null : Number(normalStatusResult.rows[0].id);
    if (!normalStatusId) {
      throw new Error("Booking status is not configured.");
    }

    const orderInsertResult = await client.query(
      `
        INSERT INTO orders (
          user_id,
          shipment_status,
          payment_status,
          payment_provider,
          payment_reference,
          paid_at,
          currency_code,
          subtotal_usd,
          shipping_usd,
          total_usd,
          clothes_weight_kg,
          box_weight_kg,
          shipping_weight_kg,
          created_at,
          updated_at
        )
        VALUES (
          $1,
          'unshipped',
          'paid',
          $2,
          $3,
          $4,
          'USD',
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          NOW(),
          NOW()
        )
        RETURNING id, paid_at
      `,
      [
        userId,
        paymentProvider,
        paymentReference,
        paidAt,
        payload.subtotalUsd,
        payload.shippingUsd,
        payload.totalUsd,
        payload.clothesWeightKg,
        payload.boxWeightKg,
        payload.shippingWeightKg,
      ]
    );

    const orderId = Number(orderInsertResult.rows[0].id);
    const persistedPaidAt = new Date(orderInsertResult.rows[0].paid_at);
    const invoiceDatePrefix = createInvoiceNumber(persistedPaidAt);
    const invoiceDayBounds = getUtcDayBounds(persistedPaidAt);

    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      `invoice-sequence:${invoiceDatePrefix}`,
    ]);

    const dailyInvoiceSequenceResult = await client.query<DailyInvoiceSequenceRow>(
      `
        SELECT COUNT(*) AS sequence_number
        FROM orders
        WHERE paid_at >= $1
          AND paid_at < $2
      `,
      [invoiceDayBounds.start, invoiceDayBounds.end]
    );
    const invoiceSequenceNumber = Number(dailyInvoiceSequenceResult.rows[0]?.sequence_number ?? 1);
    const invoiceNumber = createInvoiceNumber(persistedPaidAt, invoiceSequenceNumber);

    await client.query(
      `
        UPDATE orders
        SET invoice_number = $2,
            invoice_generated_at = NOW(),
            updated_at = NOW()
        WHERE id = $1
      `,
      [orderId, invoiceNumber]
    );

    for (const item of proctorItems) {
      const overlapResult = await client.query(
        `
          SELECT 1
          FROM bookings b
          JOIN statuses s
            ON s.id = b.status_id
          WHERE b.user_id = $1
            AND s.name <> 'canceled'
            AND b.start_time_utc < $3::timestamptz
            AND b.end_time_utc > $2::timestamptz
          LIMIT 1
        `,
        [item.proctorUserId, item.startIso, item.endIso]
      );
      if (overlapResult.rows.length > 0) {
        throw new Error("This proctor already has a booking during the selected time.");
      }

      const bookingInsertResult = await client.query(
        `
          INSERT INTO bookings (
            user_id,
            address_id,
            start_time_utc,
            end_time_utc,
            status_id,
            created_at,
            updated_at
          )
          VALUES ($1, $2, $3::timestamptz, $4::timestamptz, $5, NOW(), NOW())
          RETURNING id
        `,
        [item.proctorUserId, item.addressId, item.startIso, item.endIso, normalStatusId]
      );
      const bookingId = Number(bookingInsertResult.rows[0].id);

      await client.query(
        `
          INSERT INTO orders_proctors (
            order_id,
            proctor_user_id,
            booking_id,
            address_id,
            quantity,
            snapshot_price,
            session_hours,
            start_time_utc,
            end_time_utc,
            session_label
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz, $9::timestamptz, $10)
        `,
        [
          orderId,
          item.proctorUserId,
          bookingId,
          item.addressId,
          item.quantity,
          item.unitPriceUsd,
          item.sessionHours,
          item.startIso,
          item.endIso,
          item.sessionLabel,
        ]
      );
    }

    await client.query(
      `
        DELETE FROM cart_items
        WHERE cart_id IN (
          SELECT id
          FROM carts
          WHERE user_id = $1
        )
      `,
      [userId]
    );

    await client.query("UPDATE carts SET updated_at = NOW() WHERE user_id = $1", [userId]);

    const sessionUpdateResult = await client.query(
      `
        UPDATE stripe_checkout_sessions
        SET order_id = $2,
            completed_at = NOW(),
            updated_at = NOW()
        WHERE stripe_session_id = $1
      `,
      [paymentReference, orderId]
    );

    if (sessionUpdateResult.rowCount === 0) {
      throw new Error(
        `Missing persisted Stripe checkout session for ${paymentReference}.`
      );
    }

    await client.query("COMMIT");

    return {
      orderId,
      invoiceNumber,
      paidAt: persistedPaidAt.toISOString(),
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
