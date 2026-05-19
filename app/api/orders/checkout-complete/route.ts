// Called by the browser after Stripe redirects the customer back to /checkout/success.
// It reads the local order result created by the Stripe webhook and returns invoice details.


import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStripeCheckoutOrderStatus } from "@/lib/server/orderPayments";

// POST handler invoked after client returns from Stripe Checkout
export async function POST(request: Request) {
  // Require authenticated user
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Read Stripe sessionId from request body
  const userId = Number(session.user.id);
  const payload = (await request.json().catch(() => null)) as { sessionId?: unknown } | null;
  const sessionId = typeof payload?.sessionId === "string" ? payload.sessionId.trim() : "";

  // Validate required parameter
  if (!sessionId) {
    return NextResponse.json({ error: "Missing Stripe session id." }, { status: 400 });
  }

  try {
    // Check current status of this checkout in our system
    const status = await getStripeCheckoutOrderStatus(userId, sessionId);

    // No record of this checkout for the user
    if (status.state === "not_found") {
      return NextResponse.json(
        {
          status: "not_found",
          error: "Stripe checkout session was not found for this account.",
        },
        { status: 404 }
      );
    }

    // Payment failed according to our records/Stripe
    if (status.state === "failed") {
      return NextResponse.json(
        {
          status: "failed",
          error: status.errorMessage ?? "Payment failed. Please try again.",
        },
        { status: 409 }
      );
    }

    // Pending means the webhook has not finalized the order yet.
    if (status.state === "pending") {
      return NextResponse.json(
        {
          status: "pending",
          paymentStatus: status.paymentStatus,
          checkoutStatus: status.checkoutStatus,
        },
        { status: 409 }
      );
    }

    // Already completed: return stored order details
    return NextResponse.json({
      status: "completed",
      orderId: status.orderId,
      invoiceNumber: status.invoiceNumber,
      paidAt: status.paidAt,
    });
  } catch (error) {
    // Unexpected error while reading locally recorded checkout status.
    console.error("stripe checkout status error:", error);
    const message = error instanceof Error ? error.message : "Unable to load Stripe checkout status.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
