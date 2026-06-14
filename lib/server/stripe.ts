import Stripe from "stripe";
import { stripeSecretKey } from "@/lib/server/serverEnv";

let stripeClient: Stripe | null = null;

/**
 * Gets stripe server client for this flow.
 *
 * @returns The result used by the surrounding flow.
 */
export function getStripeServerClient() {
  if (!stripeClient) {
    stripeClient = new Stripe(stripeSecretKey());
  }

  return stripeClient;
}
