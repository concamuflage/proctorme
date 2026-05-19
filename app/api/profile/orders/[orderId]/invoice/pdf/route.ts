import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { buildInvoicePdf } from "@/lib/invoice";
import { getInvoicePayloadForOrder } from "@/lib/server/orderInvoiceStore";

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
    const invoicePayload = await getInvoicePayloadForOrder(userId, orderId);
    if (!invoicePayload) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const pdf = buildInvoicePdf(invoicePayload);
    return new NextResponse(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${invoicePayload.invoiceNumber}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("get invoice pdf for order error:", error);
    return NextResponse.json({ error: "Unable to generate invoice PDF." }, { status: 500 });
  }
}
