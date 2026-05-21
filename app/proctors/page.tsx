"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import ProctorGrid from "@/components/proctors/ProctorGrid";
import { type Proctor } from "@/components/proctors/ProctorCard";
type ProctorApiItem = {
  id: number;
  name?: string | null;
  credential?: string | null;
  specialty?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  sessionWindow?: string | null;
  rateUsd?: number | string | null;
  imageUrls?: string[] | null;
};

function formatAddress(proctor: ProctorApiItem) {
  return [proctor.address, proctor.city, proctor.state, proctor.zipCode]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean)
    .join(", ");
}

function ProctorsPageContent() {
  const [proctorsData, setProctorsData] = useState<ProctorApiItem[]>([]);
  const [cityQuery, setCityQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchProctors = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        const trimmedCityQuery = cityQuery.trim();
        if (trimmedCityQuery) {
          params.set("city", trimmedCityQuery);
        }

        const res = await fetch(`/api/proctors${params.toString() ? `?${params.toString()}` : ""}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setProctorsData(Array.isArray(data) ? data : []);
      } catch (e: unknown) {
        if (e instanceof DOMException && e.name === "AbortError") {
          return;
        }
        setError(e instanceof Error ? e.message : "Failed to load proctors");
        setProctorsData([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchProctors();
    return () => controller.abort();
  }, [cityQuery]);

  const proctors = useMemo<Proctor[]>(() => {
    return proctorsData.map((proctor) => ({
      slug: String(proctor.id),
      name: proctor.name ?? "",
      brand: proctor.credential ?? "ID-verified proctor",
      specialty: proctor.specialty ?? "Interview proctoring",
      imageUrl: Array.isArray(proctor.imageUrls) ? proctor.imageUrls[0] ?? "" : "",
      address: formatAddress(proctor),
      sessionWindow: proctor.sessionWindow ?? "90 min",
      price: proctor.rateUsd == null ? 0 : Number(proctor.rateUsd),
    }));
  }, [proctorsData]);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Find a proctor</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
            Compare verified proctors by assignment type, session fee, and supported interview
            location setup.
          </p>
        </div>

        <div className="mb-6">
          <label htmlFor="proctor-city-search" className="text-sm font-medium text-zinc-900">
            Search by city
          </label>
          <div className="mt-2">
            <input
              id="proctor-city-search"
              type="search"
              value={cityQuery}
              onChange={(event) => setCityQuery(event.target.value)}
              placeholder="Try New York or San Francisco..."
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
            />
          </div>
        </div>

        <div>
          {loading ? <div className="mb-4 text-sm text-zinc-600">Loading...</div> : null}
          {error ? <div className="mb-4 text-sm text-red-600">{error}</div> : null}

          <ProctorGrid proctors={proctors} />
        </div>
      </main>
    </div>
  );
}

export default function ProctorsPage() {
  return (
    <Suspense fallback={null}>
      <ProctorsPageContent />
    </Suspense>
  );
}
