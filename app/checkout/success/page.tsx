
"use client";

// Client-side page shown after Stripe Checkout redirect.
// Responsible for:
// - reading session/order info from URL or sessionStorage
// - reading the order created by the Stripe webhook
// - displaying invoice download link once available


import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useCart } from "@/components/cart/CartContext";
import AlertMessage from "@/components/ui/AlertMessage";

const FINALIZE_REQUEST_TIMEOUT_MS = 5000;


// Main component handling checkout success flow and UI state
/**
 * Renders the checkout success page content component.
 *
 * @returns The rendered UI for this component.
 */
function CheckoutSuccessPageContent() {
  // Read query parameters returned from Stripe redirect
  const searchParams = useSearchParams();
  const { clearCart } = useCart();
  const orderIdFromUrl = searchParams.get("orderId");
  const stripeSessionId = searchParams.get("session_id");

  // Key used to persist orderId across reloads for a specific Stripe session
  const storageKey = stripeSessionId ? `stripe-order:${stripeSessionId}` : null;

  // Initialize orderId from:
  // 1) URL (preferred)
  // 2) sessionStorage (fallback for refresh/revisit)
  const [orderId, setOrderId] = useState(() => {
    if (orderIdFromUrl) {
      return orderIdFromUrl;
    }
    if (typeof window === "undefined" || !storageKey) {
      return null;
    }
    return window.sessionStorage.getItem(storageKey);
  });

  // Loading indicates whether we are still reading webhook-created order data from backend.
  const [loading, setLoading] = useState(
    Boolean(stripeSessionId && !orderIdFromUrl),
  );

  // Error state for displaying issues while reading order data.
  const [error, setError] = useState<string | null>(null);
  const [pendingWebhook, setPendingWebhook] = useState(false);

  // Sync orderId from URL or sessionStorage and stop loading if already known
  useEffect(() => {
    if (orderIdFromUrl) {
      setOrderId(orderIdFromUrl);
      setLoading(false);
      setError(null);
      setPendingWebhook(false);
      if (storageKey) {
        window.sessionStorage.setItem(storageKey, orderIdFromUrl);
      }
      return;
    }
    if (typeof window !== "undefined" && storageKey) {
      const storedOrderId = window.sessionStorage.getItem(storageKey);
      if (storedOrderId) {
        setOrderId(storedOrderId);
        setLoading(false);
        setError(null);
        setPendingWebhook(false);
      }
    }
  }, [orderIdFromUrl, storageKey]);

  // If orderId is not yet known, ask the backend once for the order created by the webhook.
  useEffect(() => {
    if (!stripeSessionId || orderIdFromUrl || orderId) {
      return;
    }

    let cancelled = false;

    /**
     * Loads webhook order needed by this flow.
     *
     * @returns The result used by the surrounding flow.
     */
    async function loadWebhookOrder() {
      setLoading(true);
      setError(null);
      setPendingWebhook(false);

      const controller = new AbortController();
      const timeoutId = window.setTimeout(
        () => controller.abort(),
        FINALIZE_REQUEST_TIMEOUT_MS,
      );
      let response: Response | null = null;
      let payload: {
        orderId?: unknown;
        error?: string;
        status?: string;
      } | null = null;

      try {
        response = await fetch("/api/orders/checkout-complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: stripeSessionId }),
          cache: "no-store",
          signal: controller.signal,
        });

        payload = await response.json().catch(() => null);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setError("Unable to load your order after payment.");
        } else {
          setError("Loading your order took too long. Refresh this page in a moment.");
        }
        setLoading(false);
        return;
      } finally {
        window.clearTimeout(timeoutId);
      }

      if (cancelled) {
        return;
      }

      if (response?.ok && payload?.orderId != null) {
        const nextOrderId = String(payload.orderId);
        if (storageKey) {
          window.sessionStorage.setItem(storageKey, nextOrderId);
        }
        setOrderId(nextOrderId);
        setLoading(false);
        setError(null);
        setPendingWebhook(false);
        clearCart();
        window.history.replaceState(
          null,
          "",
          `/checkout/success?orderId=${encodeURIComponent(nextOrderId)}`,
        );
        return;
      }

      if (payload?.status === "pending") {
        setPendingWebhook(true);
        setLoading(false);
        return;
      }

      if (payload?.status === "failed") {
        setError(payload?.error ?? "Payment failed. Please try again.");
      } else {
        setError(payload?.error ?? "Unable to load your order after payment.");
      }
      setLoading(false);
    }

    void loadWebhookOrder();

    return () => {
      cancelled = true;
    };
  }, [clearCart, orderId, orderIdFromUrl, storageKey, stripeSessionId]);

  // Build invoice download link once orderId is available
  const invoiceHref = useMemo(() => {
    if (!orderId) {
      return null;
    }
    return `/api/profile/orders/${encodeURIComponent(orderId)}/invoice/pdf`;
  }, [orderId]);

  // Render UI based on loading, success, or error states
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          {loading ? (
            <AlertMessage role="status" tone="success">Confirming payment</AlertMessage>
          ) : null}

          <h1 className="mt-6 text-3xl font-semibold tracking-tight">
            Thank you for your order.
          </h1>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            {loading
              ? "Your payment was submitted. We are checking whether Stripe has sent the order confirmation."
              : pendingWebhook
                ? "Your payment was submitted. Your order will appear after Stripe sends the confirmation event."
                : "Your payment was recorded successfully. We saved your order and your invoice is ready to download."}
          </p>

          {error ? <AlertMessage className="mt-6" role="alert" tone="error">{error}</AlertMessage> : null}

          {pendingWebhook ? (
            <AlertMessage className="mt-6" role="status" tone="warning">
              Payment was submitted. Stripe has not finished sending the order confirmation to this app yet. Refresh this page in a moment to load your invoice.
            </AlertMessage>
          ) : null}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {invoiceHref && !loading && !error ? (
              <a
                href={invoiceHref}
                className="rounded-full bg-zinc-900 px-5 py-2 text-sm text-white hover:bg-zinc-800"
              >
                Download invoice PDF
              </a>
            ) : null}
            <Link
              href="/profile/orders"
              className="rounded-full border border-zinc-300 px-5 py-2 text-sm text-zinc-700 hover:border-zinc-500 hover:text-zinc-900"
            >
              View order history
            </Link>
            <Link
              href="/proctors"
              className="rounded-full border border-zinc-300 px-5 py-2 text-sm text-zinc-700 hover:border-zinc-500 hover:text-zinc-900"
            >
              Continue booking
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

/**
 * Renders the /checkout/success page.
 *
 * @returns The page UI.
 */
export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutSuccessPageContent />
    </Suspense>
  );
}
