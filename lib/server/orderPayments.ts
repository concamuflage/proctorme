import pool from "@/backend/database/pool";
import { createInvoiceNumber } from "@/lib/invoice";
import { calculateShippingCostRmb, getBoxWeightKg } from "@/lib/shipping";
import type Stripe from "stripe";

const RMB_TO_USD = Number(process.env.NEXT_PUBLIC_RMB_TO_USD ?? "0.14");

export type CheckoutOrderItem = {
  cartItemId: string;
  quantity: number;
  unitPriceUsd: number;
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

type AddressOwnershipRow = {
  address_id: unknown;
};

type VariantExistenceRow = {
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

export type StripePaymentDiscountDetails = {
  stripePromotionCodeId: string | null;
  stripeCouponId: string | null;
  promotionCode: string | null;
  discountAmount: number | null;
  discountCurrency: string | null;
};

type CartCheckoutRow = {
  shipping_address_id: unknown;
  billing_address_id: unknown;
  shipping_id: unknown;
  quantity: unknown;
  variant_id: unknown;
  cost_rmb: unknown;
  product_id: unknown;
  product_name: unknown;
  color: unknown;
  size: unknown;
  weight_kg: unknown;
};

type ShippingCostRow = {
  id: unknown;
  mode: unknown;
  delivery_time: unknown;
  first_kg_cost_rmb: unknown;
  additional_kg_cost_rmb: unknown;
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

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function priceUsdFromRmb(costRmb: unknown) {
  if (costRmb == null) {
    return 0;
  }
  return Math.round(toNumber(costRmb) * RMB_TO_USD);
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

export function parseVariantId(cartItemId: string) {
  const [, variantIdText] = cartItemId.split("-");
  const variantId = Number(variantIdText);
  return Number.isInteger(variantId) && variantId > 0 ? variantId : null;
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
    "shippingId",
    "shippingAddressId",
    "billingAddressId",
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
      Number.isInteger(toNumber(typedItem.quantity)) &&
      toNumber(typedItem.quantity) > 0 &&
      Number.isFinite(toNumber(typedItem.unitPriceUsd)) &&
      toNumber(typedItem.unitPriceUsd) >= 0
    );
  });
}

export async function ensureStripeCheckoutSessionTable() {
  await pool.query(
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
}

async function ensureStripeWebhookEventsTable() {
  await pool.query(
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
}

async function ensurePaymentsTable() {
  await pool.query(
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
  await pool.query("ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_promotion_code_id TEXT");
  await pool.query("ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_coupon_id TEXT");
  await pool.query("ALTER TABLE payments ADD COLUMN IF NOT EXISTS promotion_code TEXT");
  await pool.query("ALTER TABLE payments ADD COLUMN IF NOT EXISTS discount_amount INTEGER");
  await pool.query("ALTER TABLE payments ADD COLUMN IF NOT EXISTS discount_currency TEXT");
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
  shippingAddressId,
  billingAddressId,
  shippingId,
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
        cts.shipping_address_id,
        cts.billing_address_id,
        cts.shipping_id,
        ci.quantity,
        pv.id AS variant_id,
        pv.cost_rmb,
        p.id AS product_id,
        p.name AS product_name,
        c.color,
        s.size,
        st.weight_kg
      FROM carts cts
      LEFT JOIN cart_items ci
        ON ci.cart_id = cts.id
      LEFT JOIN product_variants pv
        ON pv.id = ci.variant_id
      LEFT JOIN products p
        ON p.id = pv.product_id
      LEFT JOIN colors c
        ON c.id = pv.color_id
      LEFT JOIN sizes s
        ON s.id = pv.size_id
      LEFT JOIN styles st
        ON st.id = p.style_id
      WHERE cts.user_id = $1
      ORDER BY ci.created_at ASC NULLS LAST, pv.id ASC NULLS LAST
    `,
    [userId]
  );

  const cartItems = cartResult.rows.filter((row: CartCheckoutRow) => row.variant_id != null);
  if (cartItems.length === 0) {
    throw new Error("Your cart is empty.");
  }

  const cartMetadata = cartResult.rows[0];
  const selectedShippingAddressId =
    shippingAddressId == null ? toNumber(cartMetadata?.shipping_address_id) : Number(shippingAddressId);
  const selectedBillingAddressId =
    billingAddressId == null ? toNumber(cartMetadata?.billing_address_id) : Number(billingAddressId);
  const selectedShippingId =
    shippingId == null ? toNumber(cartMetadata?.shipping_id) : Number(shippingId);

  if (
    !Number.isInteger(selectedShippingAddressId) ||
    !Number.isInteger(selectedBillingAddressId) ||
    !Number.isInteger(selectedShippingId)
  ) {
    throw new Error("Select shipping, billing, and delivery details before checkout.");
  }

  const addressOwnershipResult = await pool.query<AddressOwnershipRow>(
    `
      SELECT address_id
      FROM user_addresses
      WHERE user_id = $1
        AND address_id = ANY($2::int[])
    `,
    [userId, [selectedShippingAddressId, selectedBillingAddressId]]
  );
  const ownedAddressIds = new Set(
    addressOwnershipResult.rows.map((row: AddressOwnershipRow) => Number(row.address_id))
  );
  if (!ownedAddressIds.has(selectedShippingAddressId) || !ownedAddressIds.has(selectedBillingAddressId)) {
    throw new Error("Selected addresses do not belong to the current user.");
  }

  const shippingResult = await pool.query<ShippingCostRow>(
    `
      SELECT id, mode, delivery_time, first_kg_cost_rmb, additional_kg_cost_rmb
      FROM shipping_cost
      WHERE id = $1
      LIMIT 1
    `,
    [selectedShippingId]
  );
  if (shippingResult.rows.length === 0) {
    throw new Error("Selected shipping option no longer exists.");
  }

  const items = cartItems.map((row: CartCheckoutRow) => ({
    cartItemId: `${toNumber(row.product_id)}-${toNumber(row.variant_id)}`,
    quantity: toNumber(row.quantity),
    unitPriceUsd: priceUsdFromRmb(row.cost_rmb),
    name: String(row.product_name ?? ""),
    color: row.color == null ? null : String(row.color),
    size: row.size == null ? null : String(row.size),
  }));

  const subtotalUsd = roundMoney(
    items.reduce((total: number, item: CheckoutOrderItem) => total + item.unitPriceUsd * item.quantity, 0)
  );
  const clothesWeightKg = cartItems.reduce(
    (total: number, row: CartCheckoutRow) =>
      total + (row.weight_kg == null ? 0 : toNumber(row.weight_kg)) * toNumber(row.quantity),
    0
  );
  const boxWeightKg = getBoxWeightKg(clothesWeightKg);
  const shippingWeightKg = clothesWeightKg + boxWeightKg;
  const shippingRow = shippingResult.rows[0];
  const shippingUsd = roundMoney(
    calculateShippingCostRmb(shippingWeightKg, {
      id: Number(shippingRow.id),
      mode: String(shippingRow.mode ?? ""),
      delivery_time: shippingRow.delivery_time == null ? null : String(shippingRow.delivery_time),
      first_kg_cost_rmb: shippingRow.first_kg_cost_rmb == null ? null : toNumber(shippingRow.first_kg_cost_rmb),
      additional_kg_cost_rmb:
        shippingRow.additional_kg_cost_rmb == null ? null : toNumber(shippingRow.additional_kg_cost_rmb),
    }) * RMB_TO_USD
  );

  return {
    subtotalUsd,
    shippingUsd,
    totalUsd: roundMoney(subtotalUsd + shippingUsd),
    clothesWeightKg,
    boxWeightKg,
    shippingWeightKg,
    shippingId: selectedShippingId,
    shippingAddressId: selectedShippingAddressId,
    billingAddressId: selectedBillingAddressId,
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
  const shippingId = Number(payload.shippingId);
  const shippingAddressId = Number(payload.shippingAddressId);
  const billingAddressId = Number(payload.billingAddressId);
  const variantItems = payload.items.map((item) => ({
    variantId: parseVariantId(item.cartItemId),
    quantity: Number(item.quantity),
    unitPriceUsd: Number(item.unitPriceUsd),
  }));

  if (variantItems.some((item) => item.variantId == null)) {
    throw new Error("Unable to determine one or more cart variant ids.");
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

    const addressOwnershipResult = await client.query<AddressOwnershipRow>(
      `
        SELECT address_id
        FROM user_addresses
        WHERE user_id = $1
          AND address_id = ANY($2::int[])
      `,
      [userId, [shippingAddressId, billingAddressId]]
    );

    const ownedAddressIds = new Set(
      addressOwnershipResult.rows.map((row: AddressOwnershipRow) => Number(row.address_id))
    );

    if (!ownedAddressIds.has(shippingAddressId) || !ownedAddressIds.has(billingAddressId)) {
      throw new Error("Selected addresses do not belong to the current user.");
    }

    const shippingExistsResult = await client.query(
      `
        SELECT id
        FROM shipping_cost
        WHERE id = $1
        LIMIT 1
      `,
      [shippingId]
    );

    if (shippingExistsResult.rows.length === 0) {
      throw new Error("Selected shipping option no longer exists.");
    }

    const variantIds = variantItems
      .map((item) => item.variantId)
      .filter((variantId): variantId is number => variantId != null);

    const variantExistenceResult = await client.query<VariantExistenceRow>(
      `
        SELECT id
        FROM product_variants
        WHERE id = ANY($1::int[])
      `,
      [variantIds]
    );

    const variantIdsInDatabase = new Set(
      variantExistenceResult.rows.map((row: VariantExistenceRow) => Number(row.id))
    );

    if (variantIds.some((variantId) => !variantIdsInDatabase.has(variantId))) {
      throw new Error("One or more product variants no longer exist.");
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
          shipping_id,
          shipping_address_id,
          billing_address_id,
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
          $11,
          $12,
          $13,
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
        shippingId,
        shippingAddressId,
        billingAddressId,
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

    for (const item of variantItems) {
      await client.query(
        `
          INSERT INTO orders_variants (order_id, variant_id, quantity, snapshot_price)
          VALUES ($1, $2, $3, $4)
        `,
        [orderId, item.variantId, item.quantity, item.unitPriceUsd]
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

    await client.query(
      `
        UPDATE carts
        SET shipping_address_id = NULL,
            billing_address_id = NULL,
            shipping_id = NULL,
            updated_at = NOW()
        WHERE user_id = $1
      `,
      [userId]
    );

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
