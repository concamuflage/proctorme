import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  finalizePaidOrder,
  isValidCheckoutOrderPayload,
} from "@/lib/server/orderPayments";
import { serverEnvIsProduction } from "@/lib/server/serverEnv";

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
 * Handles POST requests for the /api/orders/mock-payment route.
 *
 * @param request - Input used by post.
 *
 * @returns A Next.js response for the request.
 */
export async function POST(request: Request) {
  if (serverEnvIsProduction()) {
    return NextResponse.json({ error: "Mock payments are disabled." }, { status: 404 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  if (!isValidCheckoutOrderPayload(payload)) {
    return badRequest("Invalid mock payment payload.");
  }

  const userId = Number(session.user.id);

  try {
    const result = await finalizePaidOrder({
      userId,
      payload,
      paymentProvider: "mock",
      paymentReference: `mock-${Date.now()}`,
      paidAt: new Date(),
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("mock payment order insert error:", error);
    const message = error instanceof Error ? error.message : "Unable to save order.";
    const status =
      message.includes("do not belong") ? 403 :
      message.includes("Selected shipping option") || message.includes("proctors") ? 400 :
      500;
    return NextResponse.json({ error: message }, { status });
  }
}
