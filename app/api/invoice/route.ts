import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { buildInvoicePdf, type InvoicePayload } from "@/lib/invoice";

/**
 * Runs the bad request logic for this module.
 *
 * @param message - Input used by bad request.
 *
 * @returns The result used by the surrounding flow.
 */
function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

/**
 * Checks whether valid address is true for this flow.
 *
 * @param address - Input used by is valid address.
 *
 * @returns True when the value satisfies the check.
 */
function isValidAddress(address: unknown) {
  if (!address || typeof address !== "object") return false;

  const candidate = address as Record<string, unknown>;
  return ["street", "city", "state", "zipCode", "country"].every(
    (field) => typeof candidate[field] === "string" && candidate[field]?.toString().trim().length > 0
  );
}

/**
 * Checks whether valid item is true for this flow.
 *
 * @param item - Input used by is valid item.
 *
 * @returns True when the value satisfies the check.
 */
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

/**
 * Handles POST requests for the /api/invoice route.
 *
 * @param request - Input used by post.
 *
 * @returns A Next.js response for the request.
 */
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
