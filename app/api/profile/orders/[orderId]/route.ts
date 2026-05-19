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
  shipping_id: unknown;
  shipping_mode: unknown;
  shipping_delivery_time: unknown;
  first_kg_cost_rmb: unknown;
  additional_kg_cost_rmb: unknown;
  shipping_address_id: unknown;
  shipping_name: unknown;
  shipping_street: unknown;
  shipping_city: unknown;
  shipping_state: unknown;
  shipping_zip_code: unknown;
  shipping_country: unknown;
  shipping_phone: unknown;
  billing_address_id: unknown;
  billing_name: unknown;
  billing_street: unknown;
  billing_city: unknown;
  billing_state: unknown;
  billing_zip_code: unknown;
  billing_country: unknown;
  billing_phone: unknown;
};

type SingleOrderItemRow = {
  product_id: unknown;
  variant_id: unknown;
  quantity: unknown;
  snapshot_price: unknown;
  sku: unknown;
  product_name: unknown;
  color: unknown;
  size: unknown;
  weight_kg: unknown;
  image_link: unknown;
  variant_exists: unknown;
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
          o.created_at,
          sc.id AS shipping_id,
          sc.mode AS shipping_mode,
          sc.delivery_time AS shipping_delivery_time,
          sc.first_kg_cost_rmb,
          sc.additional_kg_cost_rmb,
          sa.id AS shipping_address_id,
          sa.name AS shipping_name,
          sa.street AS shipping_street,
          sa.city AS shipping_city,
          sa.state AS shipping_state,
          sa.zip_code AS shipping_zip_code,
          sa.country AS shipping_country,
          sa.phone AS shipping_phone,
          ba.id AS billing_address_id,
          ba.name AS billing_name,
          ba.street AS billing_street,
          ba.city AS billing_city,
          ba.state AS billing_state,
          ba.zip_code AS billing_zip_code,
          ba.country AS billing_country,
          ba.phone AS billing_phone
        FROM orders o
        JOIN shipping_cost sc
          ON sc.id = o.shipping_id
        LEFT JOIN addresses sa
          ON sa.id = o.shipping_address_id
        LEFT JOIN addresses ba
          ON ba.id = o.billing_address_id
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
          p.id AS product_id,
          ov.variant_id,
          ov.quantity,
          ov.snapshot_price,
          pv.sku,
          p.name AS product_name,
          c.color,
          s.size,
          st.weight_kg,
          pvi.image_link,
          pv.id IS NOT NULL AS variant_exists
        FROM orders_variants ov
        LEFT JOIN product_variants pv
          ON pv.id = ov.variant_id
        LEFT JOIN products p
          ON p.id = pv.product_id
        LEFT JOIN colors c
          ON c.id = pv.color_id
        LEFT JOIN sizes s
          ON s.id = pv.size_id
        LEFT JOIN styles st
          ON st.id = p.style_id
        LEFT JOIN LATERAL (
          SELECT image_link
          FROM product_variant_images
          WHERE product_variant_id = pv.id
          ORDER BY id ASC
          LIMIT 1
        ) pvi ON true
        WHERE ov.order_id = $1
        ORDER BY ov.id ASC
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
        id: toNumber(row.shipping_id),
        mode: String(row.shipping_mode ?? ""),
        deliveryTime: row.shipping_delivery_time ? String(row.shipping_delivery_time) : null,
        firstKgCostRmb: toNumber(row.first_kg_cost_rmb),
        additionalKgCostRmb: toNumber(row.additional_kg_cost_rmb),
      },
      shippingAddress: row.shipping_address_id
        ? {
            id: toNumber(row.shipping_address_id),
            name: row.shipping_name ? String(row.shipping_name) : null,
            street: row.shipping_street ? String(row.shipping_street) : null,
            city: row.shipping_city ? String(row.shipping_city) : null,
            state: row.shipping_state ? String(row.shipping_state) : null,
            zipCode: row.shipping_zip_code ? String(row.shipping_zip_code) : null,
            country: row.shipping_country ? String(row.shipping_country) : null,
            phone: row.shipping_phone ? String(row.shipping_phone) : null,
          }
        : null,
      billingAddress: row.billing_address_id
        ? {
            id: toNumber(row.billing_address_id),
            name: row.billing_name ? String(row.billing_name) : null,
            street: row.billing_street ? String(row.billing_street) : null,
            city: row.billing_city ? String(row.billing_city) : null,
            state: row.billing_state ? String(row.billing_state) : null,
            zipCode: row.billing_zip_code ? String(row.billing_zip_code) : null,
            country: row.billing_country ? String(row.billing_country) : null,
            phone: row.billing_phone ? String(row.billing_phone) : null,
          }
        : null,
      items: itemsResult.rows.map((itemRow: SingleOrderItemRow) => {
        return {
          productId: itemRow.product_id == null ? null : toNumber(itemRow.product_id),
          variantId: toNumber(itemRow.variant_id),
          quantity: toNumber(itemRow.quantity),
          unitPriceUsd: toNumber(itemRow.snapshot_price),
          sku: itemRow.sku ? String(itemRow.sku) : null,
          productName: String(itemRow.product_name ?? ""),
          color: itemRow.color ? String(itemRow.color) : null,
          size: itemRow.size ? String(itemRow.size) : null,
          weightKg: itemRow.weight_kg == null ? null : toNumber(itemRow.weight_kg),
          imageUrl: itemRow.image_link ? String(itemRow.image_link) : null,
          variantExists: Boolean(itemRow.variant_exists),
        };
      }),
    });
  } catch (error) {
    console.error("get single profile order error:", error);
    return NextResponse.json({ error: "Unable to load order." }, { status: 500 });
  }
}
