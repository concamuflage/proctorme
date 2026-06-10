import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getInvoicePayloadForOrder } from "@/lib/server/orderInvoiceStore";

type RouteContext = {
  params: Promise<{
    orderId: string;
  }>;
};

/**
 * Handles GET requests for the /api/profile/orders/:orderId/invoice route.
 *
 * @param _request - Input used by get.
 * @param context - Input used by get.
 *
 * @returns A Next.js response for the request.
 */
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
    const invoicePayload = await getInvoicePayloadForOrder(userId, orderId);
    if (!invoicePayload) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    return NextResponse.json(invoicePayload);
  } catch (error) {
    console.error("get invoice payload for order error:", error);
    return NextResponse.json({ error: "Unable to load invoice payload." }, { status: 500 });
  }
}
