import pool from "@/lib/server/database/pool";
import type { InvoiceAddress, InvoiceItem, InvoicePayload } from "@/lib/invoice";

// This module builds an invoice payload for a given order.
// It queries order, payment, and item data from the database,
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
};

// Represents the shape of each order item row
type OrderInvoiceItemRow = {
  quantity: unknown;
  snapshot_price: unknown;
  session_hours: unknown;
  first_name: unknown;
  last_name: unknown;
  address_street: unknown;
  address_city: unknown;
  address_state: unknown;
  address_zip_code: unknown;
  session_label: unknown;
  session_window: unknown;
};

// Fetches and constructs the full invoice payload for a specific order and user
// Combines order details, payment info, shipping data, and line items
export async function getInvoicePayloadForOrder(userId: number, orderId: number): Promise<InvoicePayload | null> {
  // Query main order + payment data
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
        u.email AS customer_email
      FROM orders o
      JOIN users u
        ON u.id = o.user_id
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

  // Query order line items from booked proctor users.
  const itemsResult = await pool.query<OrderInvoiceItemRow>(
    `
      SELECT
        op.quantity,
        op.snapshot_price,
        op.session_hours,
        u.first_name,
        u.last_name,
        a.street AS address_street,
        ci.name AS address_city,
        s.code AS address_state,
        a.zip_code AS address_zip_code,
        op.session_label,
        CASE
          WHEN COALESCE(u.minimum_hours, 1) = COALESCE(u.maximum_hours, COALESCE(u.minimum_hours, 1))
            THEN CONCAT(COALESCE(u.minimum_hours, 1), ' hr')
          ELSE CONCAT(COALESCE(u.minimum_hours, 1), '-', COALESCE(u.maximum_hours, COALESCE(u.minimum_hours, 1)), ' hr')
        END AS session_window
      FROM orders_proctors op
      JOIN users u
        ON u.id = op.proctor_user_id
      LEFT JOIN addresses a
        ON a.id = COALESCE(op.address_id, u.proctor_address_id)
      LEFT JOIN cities ci
        ON ci.id = a.city_id
      LEFT JOIN states s
        ON s.id = a.state_id
      WHERE op.order_id = $1
      ORDER BY op.id ASC
    `,
    [orderId]
  );

  const invoiceItems: Array<{ item: InvoiceItem; interviewAddress: InvoiceAddress }> = itemsResult.rows.map((itemRow: OrderInvoiceItemRow) => {
    const sessionHours = itemRow.session_hours == null ? null : toNumber(itemRow.session_hours);
    const lineTotalUsd = toNumber(itemRow.snapshot_price);
    const hourlyRateUsd =
      sessionHours && Number.isFinite(sessionHours) && sessionHours > 0
        ? lineTotalUsd / sessionHours
        : lineTotalUsd;
    const interviewAddress = {
      name: "",
      street: String(itemRow.address_street ?? "").trim(),
      city: String(itemRow.address_city ?? "").trim(),
      state: String(itemRow.address_state ?? "").trim(),
      zipCode: String(itemRow.address_zip_code ?? "").trim(),
      country: "",
      phone: "",
    };

    return {
      item: {
        name: [itemRow.first_name, itemRow.last_name].map((part) => String(part ?? "").trim()).filter(Boolean).join(" "),
        quantity: toNumber(itemRow.quantity),
        unitPriceUsd: lineTotalUsd,
        hourlyRateUsd,
        sessionHours,
        color: [itemRow.address_street, itemRow.address_city, itemRow.address_state, itemRow.address_zip_code]
          .map((part) => String(part ?? "").trim())
          .filter(Boolean)
          .join(", ") || null,
        size: itemRow.session_label ? String(itemRow.session_label) : itemRow.session_window ? String(itemRow.session_window) : null,
      },
      interviewAddress,
    };
  });
  const primaryInterviewAddress = invoiceItems.find(({ interviewAddress }) => interviewAddress.street)?.interviewAddress ?? {
    name: "",
    street: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
    phone: "",
  };

  // Build final invoice payload object
  return {
    invoiceNumber: String(row.invoice_number ?? ""),
    paidAt: toIsoString(row.paid_at),
    customerEmail: row.customer_email ? String(row.customer_email) : null,
    shippingModeLabel: "Proctoring service",
    subtotalUsd: toNumber(row.subtotal_usd),
    shippingUsd: toNumber(row.shipping_usd),
    totalUsd: paidTotalUsd,
    promotionCode: row.promotion_code ? String(row.promotion_code) : null,
    discountAmountUsd,
    discountCurrency,
    // Map DB item rows into invoice line items
    items: invoiceItems.map(({ item }) => item),
    shippingAddress: primaryInterviewAddress,
    billingAddress: {
      name: "",
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
      phone: "",
    },
  };
}
