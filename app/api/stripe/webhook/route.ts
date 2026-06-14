
// Overview:
// This endpoint receives Stripe webhook events, verifies their authenticity,
// enforces idempotency, and updates order/payment state.
// Only trusted server-side events (webhooks) trigger side effects like emails.

// This is the API that Stripe calls with payment updates.
// It was configured in the Stripe dashboard
// This file contains the API handler for the api call

// Imports for Stripe types/client and application services used to validate,
// persist, and finalize orders and payments

import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  assertStripePaymentMatchesCheckoutPayload,
  createStripeWebhookEvent,
  finalizePaidOrder,
  getStripeCheckoutSessionById,
  isValidCheckoutOrderPayload,
  markStripeWebhookEventProcessed,
  readStripePaymentDiscountDetails,
  readStripePromotionCodeIdFromCheckoutSession,
  readStripeChargeId,
  readStripeCustomerId,
  readStripePaymentIntentId,
  upsertStripePaymentRecord,
} from "@/lib/server/orderPayments";
import { sendInvoiceLinkEmail } from "@/lib/server/invoiceEmail";
import { getInvoicePayloadForOrder } from "@/lib/server/orderInvoiceStore";
import { getStripeServerClient } from "@/lib/server/stripe";
import { stripeWebhookSecret } from "@/lib/server/serverEnv";

// Ensure this route runs in Node.js runtime (required for Stripe SDK and raw body access)
export const runtime = "nodejs";

/**
 * Gets webhook secret for this flow.
 *
 * @returns The result used by the surrounding flow.
 */
function getWebhookSecret() {
  return stripeWebhookSecret();
}

// Converts Unix timestamp (seconds) to JavaScript Date, returns null if invalid
/**
 * Converts a value to date or null.
 *
 * @param value - Input used by to date or null.
 *
 * @returns The result used by the surrounding flow.
 */
function toDateOrNull(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? new Date(value * 1000) : null;
}

// Fetches checkout session with expanded fields (payment intent, charge, discounts)
/**
 * Runs the retrieve checkout session with discounts logic for this module.
 *
 * @param session - Input used by retrieve checkout session with discounts.
 *
 * @returns The result used by the surrounding flow.
 */
async function retrieveCheckoutSessionWithDiscounts(session: Stripe.Checkout.Session) {
  // Re-fetch the session with expanded fields to avoid additional API calls later
  return getStripeServerClient().checkout.sessions.retrieve(session.id, {
    expand: [
      "payment_intent",
      "payment_intent.latest_charge",
      "total_details.breakdown.discounts.discount",
    ],
  });
}

// Retrieves promotion code details associated with the checkout session (if any)
/**
 * Runs the retrieve promotion code for session logic for this module.
 *
 * @param session - Input used by retrieve promotion code for session.
 *
 * @returns The result used by the surrounding flow.
 */
async function retrievePromotionCodeForSession(session: Stripe.Checkout.Session) {
  // Extract promotion code id (if present) from session
  const promotionCodeId = readStripePromotionCodeIdFromCheckoutSession(session);
  return promotionCodeId ? getStripeServerClient().promotionCodes.retrieve(promotionCodeId) : null;
}

// Summary:
// Stripe may return payment_intent as either:
// 1) a string ID (default, not expanded)
// 2) a full object (when using expand)
// This function normalizes both cases by:
// - returning the object directly if already expanded
// - fetching the full object if only an ID is provided
// - returning null if no valid payment intent exists
// This ensures downstream logic always works with a complete PaymentIntent object
// Retrieves PaymentIntent object, handling both expanded and non-expanded cases
/**
 * Runs the retrieve payment intent for session logic for this module.
 *
 * @param session - Input used by retrieve payment intent for session.
 *
 * @returns The result used by the surrounding flow.
 */
async function retrievePaymentIntentForSession(session: Stripe.Checkout.Session) {
  // Handle both expanded object and string id forms of payment_intent
  if (!session.payment_intent) {
    return null;
  }

  if (typeof session.payment_intent !== "string") {
    return session.payment_intent;
  }

  const paymentIntentId = readStripePaymentIntentId(session.payment_intent);
  if (!paymentIntentId) {
    return null;
  }

  const stripe = getStripeServerClient();
  return stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ["latest_charge"],
  });
}

// Non-blocking email: failures are logged but do not break webhook processing
/**
 * Sends invoice email for order for this flow.
 *
 * @param userId - Input used by send invoice email for order.
 * @param orderId - Input used by send invoice email for order.
 *
 * @returns The result used by the surrounding flow.
 */
async function sendInvoiceEmailForOrder(userId: number, orderId: number) {
  try {
    const invoicePayload = await getInvoicePayloadForOrder(userId, orderId);
    if (!invoicePayload?.customerEmail) {
      return;
    }

    await sendInvoiceLinkEmail({
      to: invoicePayload.customerEmail,
      orderId,
      invoiceNumber: invoicePayload.invoiceNumber,
      paidAt: invoicePayload.paidAt,
    });
  } catch (error) {
    console.error("invoice email error:", error);
  }
}

// Main happy-path handler for successful payments
// Performs validation, order finalization, payment recording, and email sending
/**
 * Records successful checkout session for this flow.
 *
 * @param stripeEventId - Input used by record successful checkout session.
 * @param checkoutSession - Input used by record successful checkout session.
 *
 * @returns The result used by the surrounding flow.
 */
async function recordSuccessfulCheckoutSession(
  stripeEventId: string,
  checkoutSession: Stripe.Checkout.Session
) {
  // Load full checkout session data from Stripe
  const expandedCheckoutSession = await retrieveCheckoutSessionWithDiscounts(checkoutSession);
  // Load promotion/discount information if present
  const expandedPromotionCode = await retrievePromotionCodeForSession(expandedCheckoutSession);
  // Retrieve locally stored checkout payload for validation
  const persistedCheckout = await getStripeCheckoutSessionById(checkoutSession.id);
  if (!persistedCheckout || !persistedCheckout.userId) {
    throw new Error(
      `Stripe checkout session ${checkoutSession.id} has not been persisted locally yet.`
    );
  }

  // Ensure stored payload is valid
  if (!isValidCheckoutOrderPayload(persistedCheckout.payload)) {
    throw new Error(
      `Stripe checkout session ${checkoutSession.id} has an invalid saved payload.`
    );
  }

  // Load payment intent details for verification
  const paymentIntent = await retrievePaymentIntentForSession(expandedCheckoutSession);
  // Validate Stripe data matches original checkout payload (security check)
  assertStripePaymentMatchesCheckoutPayload({
    payload: persistedCheckout.payload,
    checkoutSession: expandedCheckoutSession,
    paymentIntent,
  });

  // Mark order as paid and persist business data
  const result = await finalizePaidOrder({
    userId: persistedCheckout.userId,
    payload: persistedCheckout.payload,
    paymentProvider: "stripe",
    paymentReference: checkoutSession.id,
    paidAt: new Date(),
  });

  // Prefer expanded paymentIntent id, fallback to id parsed from session
  const paymentIntentId = paymentIntent?.id ?? readStripePaymentIntentId(checkoutSession.payment_intent);
  if (paymentIntentId) {
    // Save or update payment record (idempotent)
    await upsertStripePaymentRecord({
      stripePaymentIntentId: paymentIntentId,
      stripeCheckoutSessionId: expandedCheckoutSession.id,
      stripeCustomerId: readStripeCustomerId(expandedCheckoutSession.customer),
      stripeChargeId: readStripeChargeId(paymentIntent?.latest_charge ?? null),
      status: "paid",
      amount: paymentIntent?.amount_received ?? expandedCheckoutSession.amount_total ?? 0,
      currency: String(paymentIntent?.currency ?? expandedCheckoutSession.currency ?? "usd"),
      customerEmail: expandedCheckoutSession.customer_details?.email ?? expandedCheckoutSession.customer_email ?? null,
      paidAt: toDateOrNull(paymentIntent?.created ?? null) ?? new Date(result.paidAt),
      orderId: result.orderId,
      discountDetails: readStripePaymentDiscountDetails(expandedCheckoutSession, expandedPromotionCode),
    });
  }

  // Send invoice email to customer
  await sendInvoiceEmailForOrder(persistedCheckout.userId, result.orderId);
  await markStripeWebhookEventProcessed(stripeEventId, result.orderId);
}

// Entry point for all Stripe webhook events
/**
 * Handles POST requests for the /api/stripe/webhook route.
 *
 * @param request - Input used by post.
 *
 * @returns A Next.js response for the request.
 */
export async function POST(request: Request) {
  // Validate presence of Stripe signature header
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  // Will hold the verified Stripe event
  let event: Stripe.Event;

  try {
    // Verify webhook signature and construct event object
    const payload = await request.text();
    event = getStripeServerClient().webhooks.constructEvent(payload, signature, getWebhookSecret());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid Stripe webhook payload.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    // Safely narrow the event payload to a Checkout Session when applicable
    const checkoutSessionObject =
      event.data.object && "object" in event.data.object && event.data.object.object === "checkout.session"
        ? (event.data.object as Stripe.Checkout.Session)
        : null;

    const checkoutSessionId = checkoutSessionObject?.id ?? null;
    const paymentIntentId =
      readStripePaymentIntentId(checkoutSessionObject?.payment_intent ?? null) ?? null;

    // Persist the event for idempotency and auditing (prevents duplicate handling)
    const insertResult = await createStripeWebhookEvent(
      event.id,
      event.type,
      event,
      checkoutSessionId,
      paymentIntentId
    );

    // If event already processed, return early
    if (!insertResult.inserted && insertResult.processedAt) {
      return NextResponse.json({
        received: true,
        duplicate: true,
        processed: true,
        orderId: insertResult.orderId,
      });
    }

    // Only handle checkout completion events; mark others as processed/ignored
    if (event.type !== "checkout.session.completed") {
      await markStripeWebhookEventProcessed(event.id);
      return NextResponse.json({ received: true, ignored: true });
    }

    // Guard: ensure expected object is present for this event type
    if (!checkoutSessionObject) {
      throw new Error("checkout.session.completed event did not include a Checkout Session object.");
    }

    // Guard: only process fully paid sessions
    if (checkoutSessionObject.payment_status !== "paid") {
      await markStripeWebhookEventProcessed(event.id);
      return NextResponse.json({
        received: true,
        ignored: true,
        paymentStatus: checkoutSessionObject.payment_status,
      });
    }

    await recordSuccessfulCheckoutSession(event.id, checkoutSessionObject);

    // Acknowledge successful receipt of webhook
    return NextResponse.json({ received: true });
  } catch (error) {
    // Any error here indicates a failure in processing this webhook event
    console.error("stripe webhook processing error:", error);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
