"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useAuthModal } from "@/components/auth/AuthModalContext";
import ItemsPanel from "@/components/cart/ItemsPanel";
import OrderSummary from "@/components/cart/OrderSummary";
import { useCart } from "@/components/cart/CartContext";

function CartPageContent() {
  const searchParams = useSearchParams();
  const { status } = useSession();
  const { openLoginModal } = useAuthModal();
  const opensCheckoutFromUrl = searchParams.get("checkout") === "1";
  const {
    items,
    subtotal,
    removeItem,
  } = useCart();
  const [showCheckoutReview, setShowCheckoutReview] = useState(opensCheckoutFromUrl);
  const [stripeCheckoutLoading, setStripeCheckoutLoading] = useState(false);
  const [stripeCheckoutError, setStripeCheckoutError] = useState<string | null>(null);
  const canStartStripeCheckout = items.length > 0 && status !== "loading";

  async function handleStripeCheckout() {
    if (!canStartStripeCheckout) {
      setStripeCheckoutError("Select at least one proctor before completing payment.");
      return;
    }

    if (status !== "authenticated") {
      setStripeCheckoutError("Please sign in before completing payment.");
      openLoginModal();
      return;
    }

    setStripeCheckoutLoading(true);
    setStripeCheckoutError(null);

    try {
      const response = await fetch("/api/orders/checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subtotalUsd: subtotal,
          shippingUsd: 0,
          totalUsd: subtotal,
          shippingId: 0,
          shippingAddressId: 0,
          billingAddressId: 0,
          items: items.map((item) => ({
            cartItemId: item.id,
            quantity: item.qty,
            unitPriceUsd: item.price,
            name: item.name,
            color: item.color,
            size: item.size,
          })),
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.url) {
        if (response.status === 401) {
          openLoginModal();
          throw new Error("Please sign in before completing payment.");
        }
        throw new Error(payload?.error || "Unable to start checkout.");
      }

      window.location.href = String(payload.url);
    } catch (error) {
      setStripeCheckoutError(error instanceof Error ? error.message : "Unable to start checkout.");
      setStripeCheckoutLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Your booking</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Review selected proctors and proceed to secure payment.
          </p>
        </div>

        {items.length === 0 ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 text-center sm:p-10">
            <div className="text-sm text-zinc-600">No proctors selected.</div>
            <Link
              href="/proctors"
              className="mt-4 inline-block rounded-full bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-800"
            >
              Find proctors
            </Link>
          </div>
        ) : (
          <>
            <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr] xl:items-start">
              <ItemsPanel items={items} onRemove={removeItem} />
              <aside className="rounded-[2rem] border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
                <OrderSummary subtotal={subtotal} testIdPrefix="cart" />
                <button
                  type="button"
                  onClick={() => setShowCheckoutReview((current) => !current)}
                  className={`mt-6 w-full rounded-full px-4 py-2 text-sm transition ${
                    showCheckoutReview
                      ? "bg-zinc-700 text-white ring-2 ring-zinc-300 hover:bg-zinc-800"
                      : "bg-zinc-900 text-white hover:bg-zinc-800"
                  }`}
                >
                  {showCheckoutReview ? "Hide payment" : "Checkout"}
                </button>
              </aside>
            </div>

            {showCheckoutReview ? (
              <section className="mt-8 rounded-[2rem] border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-900">Payment</h3>
                    <p className="mt-1 text-sm text-zinc-600">Pay securely with Stripe Checkout.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleStripeCheckout}
                    disabled={!canStartStripeCheckout || stripeCheckoutLoading}
                    className="rounded-full bg-zinc-900 px-5 py-2 text-sm text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {stripeCheckoutLoading
                      ? "Redirecting..."
                      : status === "loading"
                        ? "Checking session..."
                        : "Pay with card"}
                  </button>
                </div>

                {stripeCheckoutError ? (
                  <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {stripeCheckoutError}
                  </div>
                ) : null}
              </section>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}

export default function CartPage() {
  return (
    <Suspense fallback={null}>
      <CartPageContent />
    </Suspense>
  );
}
