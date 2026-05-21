import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import pool from "@/backend/database/pool";
import { authOptions } from "@/lib/auth";
import { getUserIdByEmail } from "@/lib/server/profileStore";

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

type OrderItemRow = {
  proctorId: unknown;
  name: unknown;
  quantity: unknown;
  unitPriceUsd: unknown;
  color: unknown;
  size: unknown;
  weightKg: unknown;
  imageUrl: unknown;
  proctorExists: unknown;
};

type ProfileOrderRow = {
  id: unknown;
  invoice_number: unknown;
  payment_status: unknown;
  shipment_status: unknown;
  subtotal_usd: unknown;
  shipping_usd: unknown;
  total_usd: unknown;
  paid_at: unknown;
  created_at: unknown;
  items: unknown;
};

async function resolveSessionUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return null;
  }

  if (typeof session.user.id === "string" && session.user.id.trim()) {
    const userId = Number(session.user.id);
    return Number.isNaN(userId) ? null : userId;
  }

  if (typeof session.user.email === "string" && session.user.email.trim()) {
    return getUserIdByEmail(session.user.email);
  }

  return null;
}

export async function GET() {
  const userId = await resolveSessionUserId();

  if (!userId || Number.isNaN(userId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await pool.query(
      `
        SELECT
          o.id,
          o.invoice_number,
          o.payment_status,
          o.shipment_status,
          o.subtotal_usd,
          o.shipping_usd,
          o.total_usd,
          o.paid_at,
          o.created_at,
          COALESCE(
            json_agg(
              json_build_object(
                'proctorId', u.id,
                'name', CONCAT_WS(' ', u.first_name, u.last_name),
                'quantity', op.quantity,
                'unitPriceUsd', op.snapshot_price,
                'color', CONCAT_WS(', ', a.street, ci.name, s.code, a.zip_code),
                'size',
                  CASE
                    WHEN COALESCE(u.minimum_hours, 1) = COALESCE(u.maximum_hours, COALESCE(u.minimum_hours, 1))
                      THEN CONCAT(COALESCE(u.minimum_hours, 1), ' hr')
                    ELSE CONCAT(COALESCE(u.minimum_hours, 1), '-', COALESCE(u.maximum_hours, COALESCE(u.minimum_hours, 1)), ' hr')
                  END,
                'weightKg', 1,
                'imageUrl', NULL,
                'proctorExists', u.id IS NOT NULL
              )
              ORDER BY op.id ASC
            ) FILTER (WHERE op.id IS NOT NULL),
            '[]'::json
          ) AS items
        FROM orders o
        LEFT JOIN orders_proctors op
          ON op.order_id = o.id
        LEFT JOIN users u
          ON u.id = op.proctor_user_id
        LEFT JOIN addresses a
          ON a.id = u.proctor_address_id
        LEFT JOIN cities ci
          ON ci.id = a.city_id
        LEFT JOIN states s
          ON s.id = a.state_id
        WHERE o.user_id = $1
        GROUP BY o.id
        ORDER BY COALESCE(paid_at, created_at) DESC, id DESC
      `,
      [userId]
    );

    return NextResponse.json(
      result.rows.map((row: ProfileOrderRow) => ({
        id: toNumber(row.id),
        invoiceNumber: row.invoice_number ? String(row.invoice_number) : null,
        paymentStatus: String(row.payment_status ?? ""),
        shipmentStatus: String(row.shipment_status ?? ""),
        subtotalUsd: toNumber(row.subtotal_usd),
        shippingUsd: toNumber(row.shipping_usd),
        totalUsd: toNumber(row.total_usd),
        paidAt: toIsoString(row.paid_at),
        createdAt: toIsoString(row.created_at),
        items: Array.isArray(row.items)
          ? row.items.map((item: OrderItemRow) => ({
              proctorId: toNumber(item.proctorId),
              name: String(item.name ?? ""),
              quantity: toNumber(item.quantity),
              unitPriceUsd: toNumber(item.unitPriceUsd),
              color: item.color ? String(item.color) : null,
              size: item.size ? String(item.size) : null,
              weightKg: item.weightKg == null ? null : toNumber(item.weightKg),
              imageUrl: item.imageUrl ? String(item.imageUrl) : null,
              proctorExists: Boolean(item.proctorExists),
            }))
          : [],
      }))
    );
  } catch (error) {
    console.error("get profile orders error:", error);
    return NextResponse.json({ error: "Unable to load orders." }, { status: 500 });
  }
}
