import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import pool from "@/backend/database/pool";
import { authOptions } from "@/lib/auth";

function toNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value);
}

function toIsoString(value: unknown) {
  if (value == null) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string" || typeof value === "number") {
    return new Date(value).toISOString();
  }

  return null;
}

type SingleOrderRow = {
  id: unknown;
  invoice_number: unknown;
  payment_status: unknown;
  shipment_status: unknown;
  subtotal_usd: unknown;
  shipping_usd: unknown;
  total_usd: unknown;
  clothes_weight_kg: unknown;
  box_weight_kg: unknown;
  shipping_weight_kg: unknown;
  paid_at: unknown;
  created_at: unknown;
};

type SingleOrderItemRow = {
  proctor_user_id: unknown;
  quantity: unknown;
  snapshot_price: unknown;
  first_name: unknown;
  last_name: unknown;
  address_street: unknown;
  address_city: unknown;
  address_state: unknown;
  address_zip_code: unknown;
  session_window: unknown;
  proctor_exists: unknown;
};

type RouteContext = {
  params: Promise<{
    orderId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  const userId =
    typeof session?.user?.id === "string" && session.user.id.trim()
      ? Number(session.user.id)
      : null;

  if (!userId || Number.isNaN(userId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId: orderIdText } = await context.params;
  const orderId = Number(orderIdText);

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return NextResponse.json({ error: "Invalid order id." }, { status: 400 });
  }

  try {
    const orderResult = await pool.query(
      `
        SELECT
          o.id,
          o.invoice_number,
          o.payment_status,
          o.shipment_status,
          o.subtotal_usd,
          o.shipping_usd,
          o.total_usd,
          o.clothes_weight_kg,
          o.box_weight_kg,
          o.shipping_weight_kg,
          o.paid_at,
          o.created_at
        FROM orders o
        WHERE o.id = $1
          AND o.user_id = $2
        LIMIT 1
      `,
      [orderId, userId]
    );

    if (orderResult.rows.length == 0) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const row = orderResult.rows[0] as SingleOrderRow;

    const itemsResult = await pool.query(
      `
        SELECT
          op.proctor_user_id,
          op.quantity,
          op.snapshot_price,
          u.first_name,
          u.last_name,
          a.street AS address_street,
          ci.name AS address_city,
          s.code AS address_state,
          a.zip_code AS address_zip_code,
          CASE
            WHEN COALESCE(u.minimum_hours, 1) = COALESCE(u.maximum_hours, COALESCE(u.minimum_hours, 1))
              THEN CONCAT(COALESCE(u.minimum_hours, 1), ' hr')
            ELSE CONCAT(COALESCE(u.minimum_hours, 1), '-', COALESCE(u.maximum_hours, COALESCE(u.minimum_hours, 1)), ' hr')
          END AS session_window,
          u.id IS NOT NULL AS proctor_exists
        FROM orders_proctors op
        LEFT JOIN users u
          ON u.id = op.proctor_user_id
        LEFT JOIN addresses a
          ON a.id = u.proctor_address_id
        LEFT JOIN cities ci
          ON ci.id = a.city_id
        LEFT JOIN states s
          ON s.id = a.state_id
        WHERE op.order_id = $1
        ORDER BY op.id ASC
      `,
      [orderId]
    );

    return NextResponse.json({
      id: toNumber(row.id),
      invoiceNumber: row.invoice_number ? String(row.invoice_number) : null,
      paymentStatus: String(row.payment_status ?? ""),
      shipmentStatus: String(row.shipment_status ?? ""),
      subtotalUsd: toNumber(row.subtotal_usd),
      shippingUsd: toNumber(row.shipping_usd),
      totalUsd: toNumber(row.total_usd),
      clothesWeightKg: row.clothes_weight_kg == null ? null : toNumber(row.clothes_weight_kg),
      boxWeightKg: row.box_weight_kg == null ? null : toNumber(row.box_weight_kg),
      shippingWeightKg: row.shipping_weight_kg == null ? null : toNumber(row.shipping_weight_kg),
      paidAt: toIsoString(row.paid_at),
      createdAt: toIsoString(row.created_at),
      shipping: {
        id: 0,
        mode: "proctoring",
        deliveryTime: null,
        firstKgCostRmb: 0,
        additionalKgCostRmb: 0,
      },
      shippingAddress: null,
      billingAddress: null,
      items: itemsResult.rows.map((itemRow: SingleOrderItemRow) => {
        const proctorName = [itemRow.first_name, itemRow.last_name]
          .map((part) => String(part ?? "").trim())
          .filter(Boolean)
          .join(" ");
        const proctorAddress = [
          itemRow.address_street,
          itemRow.address_city,
          itemRow.address_state,
          itemRow.address_zip_code,
        ]
          .map((part) => String(part ?? "").trim())
          .filter(Boolean)
          .join(", ");
        return {
          proctorId: itemRow.proctor_user_id == null ? null : toNumber(itemRow.proctor_user_id),
          quantity: toNumber(itemRow.quantity),
          unitPriceUsd: toNumber(itemRow.snapshot_price),
          sku: itemRow.proctor_user_id ? `PM-${String(itemRow.proctor_user_id)}` : null,
          proctorName,
          color: proctorAddress || null,
          size: itemRow.session_window ? String(itemRow.session_window) : null,
          weightKg: 1,
          imageUrl: null,
          proctorExists: Boolean(itemRow.proctor_exists),
        };
      }),
    });
  } catch (error) {
    console.error("get single profile order error:", error);
    return NextResponse.json({ error: "Unable to load order." }, { status: 500 });
  }
}
