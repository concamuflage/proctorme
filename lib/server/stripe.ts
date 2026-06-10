import Stripe from "stripe";

let stripeClient: Stripe | null = null;

/**
 * Gets stripe server client for this flow.
 *
 * @returns The result used by the surrounding flow.
 */
export function getStripeServerClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY.");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey);
  }

  return stripeClient;
}
