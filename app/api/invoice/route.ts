import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { buildInvoicePdf, type InvoicePayload } from "@/lib/invoice";

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function isValidAddress(address: unknown) {
  if (!address || typeof address !== "object") return false;

  const candidate = address as Record<string, unknown>;
  return ["name", "street", "city", "state", "zipCode", "country", "phone"].every(
    (field) => typeof candidate[field] === "string" && candidate[field]?.toString().trim().length > 0
  );
}

function isValidItem(item: unknown) {
  if (!item || typeof item !== "object") return false;

  const candidate = item as Record<string, unknown>;
  return (
    typeof candidate.name === "string" &&
    candidate.name.trim().length > 0 &&
    typeof candidate.quantity === "number" &&
    candidate.quantity > 0 &&
    typeof candidate.unitPriceUsd === "number" &&
    candidate.unitPriceUsd >= 0
  );
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as InvoicePayload | null;
  if (!payload || typeof payload !== "object") {
    return badRequest("Invalid invoice payload.");
  }

  if (!payload.invoiceNumber || !payload.paidAt || !payload.shippingModeLabel) {
    return badRequest("Missing invoice metadata.");
  }

  if (!Array.isArray(payload.items) || payload.items.length === 0 || !payload.items.every(isValidItem)) {
    return badRequest("Invoice items are required.");
  }

  if (!isValidAddress(payload.shippingAddress) || !isValidAddress(payload.billingAddress)) {
    return badRequest("Shipping and billing addresses are required.");
  }

  const pdf = buildInvoicePdf({
    ...payload,
    customerEmail: session.user.email ?? payload.customerEmail ?? null,
  });

  return new NextResponse(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="invoice-${payload.invoiceNumber}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
