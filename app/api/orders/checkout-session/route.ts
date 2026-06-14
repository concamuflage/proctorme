import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStripeServerClient } from "@/lib/server/stripe";
import {
  assertStripeCheckoutSessionRateLimit,
  buildAuthoritativeCheckoutOrderPayload,
  saveStripeCheckoutSession,
  type CheckoutOrderPayload,
} from "@/lib/server/orderPayments";
import {
  optionalServerEnv,
  serverEnvIsProduction,
} from "@/lib/server/serverEnv";

type CheckoutSessionRequestItem = {
  cartItemId: string;
  quantity: number;
  unitPriceUsd: number;
  name?: string;
  color?: string | null;
  size?: string | null;
};

type CheckoutSessionRequestPayload = CheckoutOrderPayload & {
  items: CheckoutSessionRequestItem[];
};

type CheckoutSessionSelectionPayload = {
  shippingAddressId?: unknown;
  billingAddressId?: unknown;
  shippingId?: unknown;
};

/**
 * Runs the should share customer email with stripe logic for this module.
 *
 * @returns The result used by the surrounding flow.
 */
function shouldShareCustomerEmailWithStripe() {
  return serverEnvIsProduction();
}

/**
 * Gets app origin for this flow.
 *
 * @param request - Input used by get app origin.
 *
 * @returns The result used by the surrounding flow.
 */
function getAppOrigin(request: Request) {
  const configuredOrigin = optionalServerEnv("APP_URL") ?? optionalServerEnv("NEXT_PUBLIC_APP_URL");
  if (!configuredOrigin && serverEnvIsProduction()) {
    throw new Error("Missing APP_URL for Stripe checkout redirects.");
  }
  const origin = configuredOrigin || new URL(request.url).origin;
  const parsedOrigin = new URL(origin);
  if (parsedOrigin.protocol !== "https:" && parsedOrigin.hostname !== "localhost") {
    throw new Error("APP_URL must use HTTPS outside localhost.");
  }
  return parsedOrigin.origin;
}

/**
 * Runs the read selection id logic for this module.
 *
 * @param value - Input used by read selection id.
 *
 * @returns The result used by the surrounding flow.
 */
function readSelectionId(value: unknown) {
  const selectedId = Number(value);
  return Number.isInteger(selectedId) && selectedId > 0 ? selectedId : null;
}

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
 * Handles POST requests for the /api/orders/checkout-session route.
 *
 * @param request - Input used by post.
 *
 * @returns A Next.js response for the request.
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in before completing payment." }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as CheckoutSessionSelectionPayload | null;

  const userId = Number(session.user.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ error: "Please sign in before completing payment." }, { status: 401 });
  }

  try {
    const stripe = getStripeServerClient();
    await assertStripeCheckoutSessionRateLimit(userId);
    const checkoutPayload = (await buildAuthoritativeCheckoutOrderPayload({
      userId,
      shippingAddressId: readSelectionId(payload?.shippingAddressId),
      billingAddressId: readSelectionId(payload?.billingAddressId),
      shippingId: readSelectionId(payload?.shippingId),
    })) as CheckoutSessionRequestPayload;
    const origin = getAppOrigin(request);
    const customerEmail = shouldShareCustomerEmailWithStripe() ? session.user.email ?? undefined : undefined;
    const lineItems = checkoutPayload.items.map((item) => {
      const checkoutItem = item as CheckoutSessionRequestItem;
      const descriptor = [checkoutItem.color, checkoutItem.size].filter(Boolean).join(" / ");
      return {
        quantity: Number(checkoutItem.quantity),
        price_data: {
          currency: "usd",
          unit_amount: Math.round(Number(checkoutItem.unitPriceUsd) * 100),
          product_data: {
            name: checkoutItem.name?.trim() || `Item ${checkoutItem.cartItemId}`,
            ...(descriptor ? { description: descriptor } : {}),
          },
        },
      };
    });

    if (Number(checkoutPayload.shippingUsd) > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: Math.round(Number(checkoutPayload.shippingUsd) * 100),
          product_data: {
            name: "Service fee",
          },
        },
      });
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      allow_promotion_codes: true,
      payment_method_types: ["card"],
      client_reference_id: String(userId),
      customer_email: customerEmail,
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart?checkout=1`,
      line_items: lineItems,
      metadata: {
        userId: String(userId),
      },
    });

    if (typeof checkoutSession.payment_intent === "string" && checkoutSession.payment_intent) {
      await stripe.paymentIntents.update(checkoutSession.payment_intent, {
        metadata: {
          userId: String(userId),
          checkout_session_id: checkoutSession.id,
        },
      });
    }

    await saveStripeCheckoutSession(userId, checkoutSession.id, checkoutPayload);

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    });
  } catch (error) {
    console.error("stripe checkout session create error:", error);
    const message = error instanceof Error ? error.message : "Unable to start Stripe checkout.";
    const status =
      message.includes("Too many Stripe checkout attempts") ? 429 :
      message.includes("cart is empty") ||
      message.includes("Select shipping") ||
      message.includes("Selected shipping option") ? 400 :
      message.includes("do not belong") ? 403 :
      500;
    return NextResponse.json({ error: message }, { status });
  }
}
