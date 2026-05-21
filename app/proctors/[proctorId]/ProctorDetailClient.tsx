"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import ProctorGallery from "@/components/proctors/ProctorGallery";
import ProctorInfoPanel, {
  type ProctorInfoPanelProctor,
} from "@/components/proctors/ProctorInfoPanel";
import ProctorBookingCalendar, { type BookingSelection } from "@/components/proctors/ProctorBookingCalendar";
import { useCart } from "@/components/cart/CartContext";
import { useAuthModal } from "@/components/auth/AuthModalContext";
import { SITE_NAME, proctorInitials } from "@/lib/proctor";

type ProctorDetail = {
  id: number;
  name: string;
  email: string;
  credential: string;
  specialty: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  sessionWindow: string;
  rateUsd: number;
  imageUrls?: string[] | null;
  bio: string;
  slotsAvailable: number;
  ratingAverage: number | null;
  ratingCount: number;
  ratings: ProctorRating[];
};

type ProctorRating = {
  id: number;
  bookingId: number;
  rating: number;
  review: string;
  reviewerName: string;
  createdAt: string;
};

function proctorPageTitle(proctorName: string) {
  return `${proctorName} | ${SITE_NAME}`;
}
function formatAddress(proctor: ProctorDetail) {
  return [proctor.address, proctor.city, proctor.state, proctor.zipCode]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean)
    .join(", ");
}

function StarRating({ value, label }: { value: number; label: string }) {
  const rounded = Math.round(value);

  return (
    <span className="inline-flex items-center gap-0.5 text-amber-500" aria-label={label}>
      {Array.from({ length: 5 }, (_, index) => (
        <span key={index} aria-hidden="true">
          {index < rounded ? "★" : "☆"}
        </span>
      ))}
    </span>
  );
}

function formatRatingDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export default function ProctorDetailClient({ proctorIdParam }: { proctorIdParam: string }) {
  const { addItem, openCart } = useCart();
  const { status } = useSession();
  const { openLoginModal } = useAuthModal();

  const [proctor, setProctor] = useState<ProctorDetail | null>(null);
  const [bookingSelection, setBookingSelection] = useState<BookingSelection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const proctorId = useMemo(() => {
    const parsed = Number(proctorIdParam);
    return Number.isFinite(parsed) ? parsed : null;
  }, [proctorIdParam]);

  useEffect(() => {
    if (proctorId == null) {
      setProctor(null);
      setError("Invalid proctor id");
      return;
    }

    const fetchProctor = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/proctors/${proctorId}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (typeof data !== "object" || data === null || !Number.isInteger(Number(data.id))) {
          setError("Invalid proctor data");
          setProctor(null);
          return;
        }
        setProctor(data);
        setBookingSelection(null);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load proctor");
        setProctor(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProctor();
  }, [proctorId]);

  useEffect(() => {
    if (!proctor?.name) return;
    document.title = proctorPageTitle(proctor.name);
  }, [proctor?.name]);

  const infoProctor = useMemo<ProctorInfoPanelProctor | null>(() => {
    if (!proctor) return null;
    return {
      assignmentCode: `PM-${proctor.id}`,
      sessionWindow: proctor.sessionWindow,
      coordinationUnits: 1,
      description:
        proctor.bio ||
        `${proctor.name} is available for structured interview proctoring, candidate check-in, room observation, and incident documentation at the selected location.`,
      id: proctor.id,
      name: proctor.name,
      credential: proctor.credential,
      specialty: proctor.specialty,
      address: formatAddress(proctor),
      slotsAvailable: proctor.slotsAvailable,
      rateUsd: proctor.rateUsd,
      materials: [],
    };
  }, [proctor]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-zinc-600">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        {error}
      </div>
    );
  }

  if (!proctor) {
    return (
      <div className="min-h-screen flex items-center justify-center text-zinc-600">
        Proctor not found.
      </div>
    );
  }

  const address = formatAddress(proctor);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_400px]">
          <ProctorGallery
            key={`proctor-${proctor.id}`}
            photos={Array.isArray(proctor.imageUrls) ? proctor.imageUrls : []}
            alt={proctor.name}
            initialIndex={0}
          />

          <div>
            {infoProctor ? (
              <ProctorInfoPanel
                proctor={infoProctor}
                bookingDetails={
                  <div className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 text-sm">
                    <div>
                      <div className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
                        Address
                      </div>
                      <div className="mt-1 font-medium text-zinc-900">{address}</div>
                    </div>
                    <div>
                      <div className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
                        Session
                      </div>
                      <div className="mt-1 font-medium text-zinc-900">{proctor.sessionWindow}</div>
                    </div>
                    <div>
                      <div className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
                        Profile
                      </div>
                      <div className="mt-1 font-medium text-zinc-900">{proctorInitials(proctor.name)}</div>
                    </div>
                  </div>
                }
              />
            ) : null}
            {proctor.ratingCount > 0 ? (
              <section className="mt-6 rounded-lg border border-zinc-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-zinc-900">Ratings</h2>
                    <div className="mt-1 text-sm text-zinc-600">
                      {proctor.ratingAverage?.toFixed(1)} from {proctor.ratingCount} completed{" "}
                      {proctor.ratingCount === 1 ? "booking" : "bookings"}
                    </div>
                  </div>
                  <StarRating
                    value={proctor.ratingAverage ?? 0}
                    label={`${proctor.ratingAverage?.toFixed(1)} out of 5 stars`}
                  />
                </div>
                <div className="mt-4 space-y-3">
                  {proctor.ratings.map((rating) => (
                    <article key={rating.id} className="border-t border-zinc-100 pt-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm font-medium text-zinc-900">{rating.reviewerName}</div>
                        <StarRating value={rating.rating} label={`${rating.rating} out of 5 stars`} />
                      </div>
                      <div className="mt-1 text-xs text-zinc-500">{formatRatingDate(rating.createdAt)}</div>
                      {rating.review ? <p className="mt-2 text-sm leading-6 text-zinc-700">{rating.review}</p> : null}
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
            {infoProctor ? (
              <div className="mt-6 space-y-4">
                <ProctorBookingCalendar
                  proctorId={proctor.id}
                  timezone="Local time"
                  selection={bookingSelection}
                  onSelectionChange={setBookingSelection}
                />
                <button
                  type="button"
                  disabled={proctor.slotsAvailable <= 0 || !bookingSelection}
                  onClick={() => {
                    if (proctor.slotsAvailable <= 0 || !bookingSelection) return;
                    if (status !== "authenticated") {
                      openLoginModal();
                      return;
                    }
                    addItem({
                      id: `proctor-${proctor.id}-${bookingSelection.startIso}-${bookingSelection.endIso}`,
                      name: proctor.name,
                      price: Number(proctor.rateUsd) * bookingSelection.slotCount,
                      weightKg: bookingSelection.slotCount,
                      imageUrl: Array.isArray(proctor.imageUrls) ? proctor.imageUrls[0] ?? null : null,
                      color: address,
                      size: `${bookingSelection.dateLabel}, ${bookingSelection.startLabel} - ${bookingSelection.endLabel}`,
                      qty: 1,
                    });
                    openCart();
                  }}
                  className={
                    "w-full rounded-full px-4 py-3 text-sm text-white " +
                    (proctor.slotsAvailable > 0 && bookingSelection
                      ? "bg-zinc-900 hover:bg-zinc-800"
                      : "cursor-not-allowed bg-zinc-400")
                  }
                  data-testid="add-to-cart-button"
                >
                  {proctor.slotsAvailable <= 0
                    ? "No open slots"
                    : bookingSelection
                      ? `Book ${bookingSelection.slotCount} ${bookingSelection.slotCount === 1 ? "hour" : "hours"}`
                      : "Select a time"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
