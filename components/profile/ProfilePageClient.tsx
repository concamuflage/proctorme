"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/cart/CartContext";
import { formatUsd } from "@/lib/formatters";

type ProfileData = {
  user: {
    id: number;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
};

type OrderRecord = {
  items: Array<{
    proctorId: number;
    name: string;
    quantity: number;
    unitPriceUsd: number;
    color: string | null;
    size: string | null;
    weightKg: number | null;
    imageUrl: string | null;
    proctorExists: boolean;
  }>;
  id: number;
  invoiceNumber: string | null;
  paymentStatus: string;
  shipmentStatus: string;
  subtotalUsd: number;
  shippingUsd: number;
  totalUsd: number;
  paidAt: string | null;
  createdAt: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "Pending";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatName(profile: ProfileData["user"]) {
  return [profile.firstName, profile.lastName].filter(Boolean).join(" ") || profile.email;
}

export default function ProfilePageClient(_props: { initialSection?: string } = {}) {
  const { addItem } = useCart();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setLoading(true);
      setError(null);
      try {
        const [profileResponse, ordersResponse] = await Promise.all([
          fetch("/api/profile", { cache: "no-store" }),
          fetch("/api/profile/orders", { cache: "no-store" }),
        ]);

        const profilePayload = await profileResponse.json().catch(() => null);
        const ordersPayload = await ordersResponse.json().catch(() => null);

        if (!profileResponse.ok) {
          throw new Error(profilePayload?.error || "Unable to load profile.");
        }
        if (!ordersResponse.ok) {
          throw new Error(ordersPayload?.error || "Unable to load orders.");
        }
        if (cancelled) return;

        setProfile(profilePayload);
        setOrders(Array.isArray(ordersPayload) ? ordersPayload : []);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load profile.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Account</h1>
          <p className="mt-2 text-sm text-zinc-600">Manage your proctor bookings and invoices.</p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-600">
            Loading account...
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {profile && !loading ? (
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.4fr]">
            <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold">Profile</h2>
              <div className="mt-4 space-y-3 text-sm">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">Name</div>
                  <div className="mt-1 font-medium">{formatName(profile.user)}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">Email</div>
                  <div className="mt-1 font-medium">{profile.user.email}</div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-lg font-semibold">Bookings</h2>
                <Link href="/proctors" className="text-sm font-medium text-zinc-700 hover:text-zinc-950">
                  Find proctors
                </Link>
              </div>

              {orders.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                  No bookings yet.
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  {orders.map((order) => (
                    <article key={order.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="text-sm font-semibold">
                            {order.invoiceNumber ? `Invoice ${order.invoiceNumber}` : `Booking #${order.id}`}
                          </div>
                          <div className="mt-1 text-xs text-zinc-500">
                            {formatDate(order.paidAt ?? order.createdAt)} · {order.paymentStatus}
                          </div>
                        </div>
                        <div className="text-sm font-semibold">{formatUsd(order.totalUsd, 2)}</div>
                      </div>

                      <div className="mt-4 space-y-3">
                        {order.items.map((item) => (
                          <div
                            key={`${order.id}-${item.proctorId}`}
                            className="flex flex-col gap-1 text-sm sm:flex-row sm:items-start sm:justify-between"
                          >
                            <div>
                              <div className="font-medium">{item.name}</div>
                              <div className="text-zinc-500">
                                Qty {item.quantity}
                                {item.color ? ` · ${item.color}` : ""}
                                {item.size ? ` · ${item.size}` : ""}
                              </div>
                            </div>
                            {item.proctorExists ? (
                              <button
                                type="button"
                                onClick={() =>
                                  addItem({
                                    id: `proctor-${item.proctorId}`,
                                    name: item.name,
                                    price: item.unitPriceUsd,
                                    qty: item.quantity,
                                    color: item.color,
                                    size: item.size,
                                    weightKg: item.weightKg,
                                    imageUrl: item.imageUrl,
                                  })
                                }
                                className="text-left text-xs font-medium text-zinc-700 hover:text-zinc-950 sm:text-right"
                              >
                                Book again
                              </button>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : null}
      </main>
    </div>
  );
}
