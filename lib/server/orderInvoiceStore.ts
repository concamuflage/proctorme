import pool from "@/backend/database/pool";
import { formatShippingMode } from "@/lib/shipping";
import type { InvoicePayload } from "@/lib/invoice";

// This module builds an invoice payload for a given order.
// It queries order, payment, shipping, and item data from the database,
// normalizes types, and formats the result into a structure used for invoices/emails.

// Safely converts a value to a number (handles unknown DB types)
function toNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value);
}

// Converts various date formats into ISO string for consistent output
function toIsoString(value: unknown) {
  if (value == null) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string" || typeof value === "number") {
    return new Date(value).toISOString();
  }

  return "";
}

// Represents the shape of the main order query result
type OrderInvoiceRow = {
  invoice_number: unknown;
  subtotal_usd: unknown;
  shipping_usd: unknown;
  total_usd: unknown;
  promotion_code: unknown;
  discount_amount: unknown;
  discount_currency: unknown;
  paid_amount: unknown;
  paid_at: unknown;
  customer_email: unknown;
  shipping_mode: unknown;
  shipping_delivery_time: unknown;
  shipping_name: unknown;
  shipping_street: unknown;
  shipping_city: unknown;
  shipping_state: unknown;
  shipping_zip_code: unknown;
  shipping_country: unknown;
  shipping_phone: unknown;
  billing_name: unknown;
  billing_street: unknown;
  billing_city: unknown;
  billing_state: unknown;
  billing_zip_code: unknown;
  billing_country: unknown;
  billing_phone: unknown;
};

// Represents the shape of each order item row
type OrderInvoiceItemRow = {
  quantity: unknown;
  snapshot_price: unknown;
  product_name: unknown;
  color: unknown;
  size: unknown;
};

// Fetches and constructs the full invoice payload for a specific order and user
// Combines order details, payment info, shipping data, and line items
export async function getInvoicePayloadForOrder(userId: number, orderId: number): Promise<InvoicePayload | null> {
  // Query main order + payment + address data
  const orderResult = await pool.query<OrderInvoiceRow>(
    `
      SELECT
        o.id,
        o.invoice_number,
        o.subtotal_usd,
        o.shipping_usd,
        o.total_usd,
        p.promotion_code,
        p.discount_amount,
        p.discount_currency,
        p.amount AS paid_amount,
        o.paid_at,
        u.email AS customer_email,
        sc.mode AS shipping_mode,
        sc.delivery_time AS shipping_delivery_time,
        sa.name AS shipping_name,
        sa.street AS shipping_street,
        sa.city AS shipping_city,
        sa.state AS shipping_state,
        sa.zip_code AS shipping_zip_code,
        sa.country AS shipping_country,
        sa.phone AS shipping_phone,
        ba.name AS billing_name,
        ba.street AS billing_street,
        ba.city AS billing_city,
        ba.state AS billing_state,
        ba.zip_code AS billing_zip_code,
        ba.country AS billing_country,
        ba.phone AS billing_phone
      FROM orders o
      JOIN users u
        ON u.id = o.user_id
      JOIN shipping_cost sc
        ON sc.id = o.shipping_id
      JOIN addresses sa
        ON sa.id = o.shipping_address_id
      JOIN addresses ba
        ON ba.id = o.billing_address_id
      LEFT JOIN LATERAL (
        SELECT promotion_code, discount_amount, discount_currency, amount
        FROM payments
        WHERE order_id = o.id
          AND status = 'paid'
        ORDER BY paid_at DESC NULLS LAST, created_at DESC
        LIMIT 1
      ) p ON TRUE
      WHERE o.id = $1
        AND o.user_id = $2
      LIMIT 1
    `,
    [orderId, userId]
  );

  // If no order found for this user, return null
  if (orderResult.rows.length === 0) {
    return null;
  }

  // Extract single order row
  const row = orderResult.rows[0];
  // Normalize discount and payment values (Stripe stores amounts in cents)
  const discountCurrency = row.discount_currency ? String(row.discount_currency).toLowerCase() : null;
  const discountAmountUsd =
    discountCurrency === "usd" && row.discount_amount != null
      ? Math.max(0, toNumber(row.discount_amount) / 100)
      : 0;
  const paidTotalUsd =
    discountCurrency === "usd" && row.paid_amount != null
      ? toNumber(row.paid_amount) / 100
      : Math.max(0, toNumber(row.total_usd) - discountAmountUsd);

  // Query order line items (products, variants, quantity, pricing)
  const itemsResult = await pool.query<OrderInvoiceItemRow>(
    `
      SELECT
        ov.quantity,
        ov.snapshot_price,
        p.name AS product_name,
        c.color,
        s.size
      FROM orders_variants ov
      JOIN product_variants pv
        ON pv.id = ov.variant_id
      JOIN products p
        ON p.id = pv.product_id
      JOIN colors c
        ON c.id = pv.color_id
      LEFT JOIN sizes s
        ON s.id = pv.size_id
      WHERE ov.order_id = $1
      ORDER BY ov.id ASC
    `,
    [orderId]
  );

  // Build final invoice payload object
  return {
    invoiceNumber: String(row.invoice_number ?? ""),
    paidAt: toIsoString(row.paid_at),
    customerEmail: row.customer_email ? String(row.customer_email) : null,
    shippingModeLabel: `${formatShippingMode(String(row.shipping_mode ?? ""))}${row.shipping_delivery_time ? ` ${String(row.shipping_delivery_time)}` : ""}`,
    subtotalUsd: toNumber(row.subtotal_usd),
    shippingUsd: toNumber(row.shipping_usd),
    totalUsd: paidTotalUsd,
    promotionCode: row.promotion_code ? String(row.promotion_code) : null,
    discountAmountUsd,
    discountCurrency,
    // Map DB item rows into invoice line items
    items: itemsResult.rows.map((itemRow: OrderInvoiceItemRow) => ({
      name: String(itemRow.product_name ?? ""),
      quantity: toNumber(itemRow.quantity),
      unitPriceUsd: toNumber(itemRow.snapshot_price),
      color: itemRow.color ? String(itemRow.color) : null,
      size: itemRow.size ? String(itemRow.size) : null,
    })),
    // Shipping address details
    shippingAddress: {
      name: String(row.shipping_name ?? ""),
      street: String(row.shipping_street ?? ""),
      city: String(row.shipping_city ?? ""),
      state: String(row.shipping_state ?? ""),
      zipCode: String(row.shipping_zip_code ?? ""),
      country: String(row.shipping_country ?? ""),
      phone: String(row.shipping_phone ?? ""),
    },
    // Billing address details
    billingAddress: {
      name: String(row.billing_name ?? ""),
      street: String(row.billing_street ?? ""),
      city: String(row.billing_city ?? ""),
      state: String(row.billing_state ?? ""),
      zipCode: String(row.billing_zip_code ?? ""),
      country: String(row.billing_country ?? ""),
      phone: String(row.billing_phone ?? ""),
    },
  };
}
