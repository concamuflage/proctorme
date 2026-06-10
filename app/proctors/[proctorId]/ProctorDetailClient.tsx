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
import { SITE_NAME } from "@/lib/proctor";

type ProctorDetail = {
  id: number;
  name: string;
  email: string;
  credential: string;
  specialty: string;
  profession: string;
  gender: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  sessionWindow: string;
  rateUsd: number;
  hourlyRate: number;
  minimumHours: number;
  maximumHours: number;
  imageUrls?: string[] | null;
  bio: string;
  slotsAvailable: number;
  ratingAverage: number | null;
  ratingCount: number;
  ratings: ProctorRating[];
  educations: ProctorEducation[];
};

type ProctorRating = {
  id: number;
  bookingId: number;
  rating: number;
  review: string;
  reviewerName: string;
  createdAt: string;
};

type ProctorEducation = {
  degree: string;
  school: string;
  major: string;
  startMonth: string | null;
  endMonth: string | null;
};

/**
 * Runs the proctor page title logic for this module.
 *
 * @param proctorName - Input used by proctor page title.
 *
 * @returns The result used by the surrounding flow.
 */
function proctorPageTitle(proctorName: string) {
  return `${proctorName} | ${SITE_NAME}`;
}
/**
 * Formats address for display.
 *
 * @param proctor - Input used by format address.
 *
 * @returns The formatted display value.
 */
function formatAddress(proctor: ProctorDetail) {
  return [proctor.address, proctor.city, proctor.state, proctor.zipCode]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean)
    .join(", ");
}

/**
 * Renders the star rating component.
 *
 * @param value, label - Input used by star rating.
 *
 * @returns The rendered UI for this component.
 */
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

/**
 * Formats rating date for display.
 *
 * @param value - Input used by format rating date.
 *
 * @returns The formatted display value.
 */
function formatRatingDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

/**
 * Renders the proctor detail client component.
 *
 * @param proctorIdParam - Input used by proctor detail client.
 *
 * @returns The rendered UI for this component.
 */
export default function ProctorDetailClient({ proctorIdParam }: { proctorIdParam: string }) {
  const { addItem, openCart } = useCart();
  const { status } = useSession();
  const { openLoginModal } = useAuthModal();

  const [proctor, setProctor] = useState<ProctorDetail | null>(null);
  const [bookingSelection, setBookingSelection] = useState<BookingSelection | null>(null);
  const [bookingAddress, setBookingAddress] = useState({
    street: "",
    city: "",
    state: "",
    zipCode: "",
  });
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

    /**
     * Fetches proctor from the relevant API.
     *
     * @returns The result used by the surrounding flow.
     */
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
        setBookingAddress({
          street: "",
          city: typeof data.city === "string" ? data.city : "",
          state: typeof data.state === "string" ? data.state : "",
          zipCode: "",
        });
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
      description:
        proctor.bio ||
        `${proctor.name} is available for structured interview proctoring, candidate check-in, room observation, and incident documentation at the selected location.`,
      educations: Array.isArray(proctor.educations) ? proctor.educations : [],
      hourlyRate: proctor.hourlyRate ?? proctor.rateUsd,
      id: proctor.id,
      maximumHours: proctor.maximumHours,
      minimumHours: proctor.minimumHours,
      name: proctor.name,
      credential: proctor.credential,
      profession: proctor.profession || proctor.specialty,
      gender: proctor.gender,
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
  const bookingCityMatches =
    bookingAddress.city.trim().toLowerCase() === proctor.city.trim().toLowerCase();
  const bookingStateMatches =
    bookingAddress.state.trim().toLowerCase() === proctor.state.trim().toLowerCase();
  const bookingAddressReady =
    bookingAddress.street.trim().length > 0 &&
    bookingAddress.city.trim().length > 0 &&
    bookingAddress.state.trim().length > 0 &&
    bookingAddress.zipCode.trim().length > 0 &&
    bookingCityMatches &&
    bookingStateMatches;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
          <ProctorGallery
            key={`proctor-${proctor.id}`}
            photos={Array.isArray(proctor.imageUrls) ? proctor.imageUrls : []}
            alt={proctor.name}
            initialIndex={0}
          />

          <div className="space-y-5 lg:sticky lg:top-6">
            {infoProctor ? (
              <ProctorInfoPanel proctor={infoProctor} />
            ) : null}
            {proctor.ratingCount > 0 ? (
              <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
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
              <div className="space-y-4">
                <ProctorBookingCalendar
                  proctorId={proctor.id}
                  timezone="Local time"
                  selection={bookingSelection}
                  onSelectionChange={setBookingSelection}
                />
                <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                  <h2 className="text-base font-semibold text-zinc-900">Booking location</h2>
                  <div className="mt-4 grid grid-cols-1 gap-3">
                    <label className="block">
                      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Street address</span>
                      <input
                        value={bookingAddress.street}
                        onChange={(event) =>
                          setBookingAddress((current) => ({ ...current, street: event.target.value }))
                        }
                        className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900"
                        placeholder="Exact street address"
                      />
                    </label>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_90px_120px]">
                      <label className="block">
                        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">City</span>
                        <input
                          value={bookingAddress.city}
                          onChange={(event) =>
                            setBookingAddress((current) => ({ ...current, city: event.target.value }))
                          }
                          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">State</span>
                        <input
                          value={bookingAddress.state}
                          onChange={(event) =>
                            setBookingAddress((current) => ({ ...current, state: event.target.value }))
                          }
                          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">ZIP</span>
                        <input
                          value={bookingAddress.zipCode}
                          onChange={(event) =>
                            setBookingAddress((current) => ({ ...current, zipCode: event.target.value }))
                          }
                          className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900"
                          inputMode="numeric"
                        />
                      </label>
                    </div>
                  </div>
                  {!bookingCityMatches || !bookingStateMatches ? (
                    <p className="mt-3 text-sm text-red-600">
                      The booking address must be in {proctor.city}, {proctor.state}.
                    </p>
                  ) : null}
                </section>
                <button
                  type="button"
                  disabled={proctor.slotsAvailable <= 0 || !bookingSelection || !bookingAddressReady}
                  onClick={() => {
                    if (proctor.slotsAvailable <= 0 || !bookingSelection || !bookingAddressReady) return;
                    if (status !== "authenticated") {
                      openLoginModal();
                      return;
                    }
                    const enteredAddress = [
                      bookingAddress.street,
                      bookingAddress.city,
                      bookingAddress.state,
                      bookingAddress.zipCode,
                    ]
                      .map((part) => part.trim())
                      .filter(Boolean)
                      .join(", ");
                    addItem({
                      id: `proctor-${proctor.id}`,
                      name: proctor.name,
                      price: Number(proctor.rateUsd) * bookingSelection.slotCount,
                      sessionHours: bookingSelection.slotCount,
                      startIso: bookingSelection.startIso,
                      endIso: bookingSelection.endIso,
                      bookingAddressStreet: bookingAddress.street.trim(),
                      bookingAddressCity: bookingAddress.city.trim(),
                      bookingAddressState: bookingAddress.state.trim(),
                      bookingAddressZip: bookingAddress.zipCode.trim(),
                      imageUrl: Array.isArray(proctor.imageUrls) ? proctor.imageUrls[0] ?? null : null,
                      color: enteredAddress || address,
                      size: `${bookingSelection.dateLabel}, ${bookingSelection.startLabel} - ${bookingSelection.endLabel}`,
                      qty: 1,
                    });
                    openCart();
                  }}
                  className={
                    "w-full rounded-full px-4 py-3 text-sm text-white " +
                    (proctor.slotsAvailable > 0 && bookingSelection && bookingAddressReady
                      ? "bg-zinc-900 hover:bg-zinc-800"
                      : "cursor-not-allowed bg-zinc-400")
                  }
                  data-testid="add-to-cart-button"
                >
                  {proctor.slotsAvailable <= 0
                    ? "No open slots"
                    : bookingSelection
                      ? bookingAddressReady
                        ? `Book ${bookingSelection.slotCount} ${bookingSelection.slotCount === 1 ? "hour" : "hours"}`
                        : "Enter booking location"
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
