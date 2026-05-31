"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import ProctorGrid from "@/components/proctors/ProctorGrid";
import { type Proctor } from "@/components/proctors/ProctorCard";
type ProctorApiItem = {
  id: number;
  name?: string | null;
  credential?: string | null;
  specialty?: string | null;
  gender?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  country?: string | null;
  sessionWindow?: string | null;
  rateUsd?: number | string | null;
  ratingAverage?: number | string | null;
  ratingCount?: number | string | null;
  imageUrls?: string[] | null;
};

type ProctorFilterOptions = {
  countries: string[];
  states: string[];
  cities: string[];
  professions: string[];
  genders: string[];
  hourlyRateMin: number | null;
  hourlyRateMax: number | null;
  cityTimeZone: string | null;
};

const EMPTY_FILTER_OPTIONS: ProctorFilterOptions = {
  countries: [],
  states: [],
  cities: [],
  professions: [],
  genders: [],
  hourlyRateMin: null,
  hourlyRateMax: null,
  cityTimeZone: null,
};

function formatLocation(proctor: ProctorApiItem) {
  return [proctor.city, proctor.state, proctor.country]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean)
    .join(", ");
}

function todayDateId() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function timeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const valueByType = new Map(parts.map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(
    Number(valueByType.get("year")),
    Number(valueByType.get("month")) - 1,
    Number(valueByType.get("day")),
    Number(valueByType.get("hour")),
    Number(valueByType.get("minute")),
    Number(valueByType.get("second"))
  );

  return asUtc - date.getTime();
}

function zonedLocalTimeToUtc(dateId: string, time: string, timeZone: string) {
  const [year, month, day] = dateId.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const localAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  let utcMs = localAsUtc;

  for (let index = 0; index < 2; index += 1) {
    utcMs = localAsUtc - timeZoneOffsetMs(new Date(utcMs), timeZone);
  }

  const date = new Date(utcMs);
  return Number.isFinite(date.getTime()) ? date : null;
}

function availabilityWindow(dateId: string, startTime: string, endTime: string, city: string, cityTimeZone: string | null) {
  const hasAnyValue = Boolean(dateId || startTime || endTime);
  if (!hasAnyValue) return { startIso: null, endIso: null, error: null };

  if (!city) {
    return { startIso: null, endIso: null, error: "Choose a city before selecting an available time." };
  }

  if (!cityTimeZone) {
    return { startIso: null, endIso: null, error: "Unable to determine the selected city's timezone." };
  }

  if (!dateId || !startTime || !endTime) {
    return { startIso: null, endIso: null, error: "Choose a date, start time, and end time to filter by availability." };
  }

  const start = zonedLocalTimeToUtc(dateId, startTime, cityTimeZone);
  const end = zonedLocalTimeToUtc(dateId, endTime, cityTimeZone);

  if (!start || !end) {
    return { startIso: null, endIso: null, error: "Choose a valid availability window." };
  }

  if (start.getTime() >= end.getTime()) {
    return { startIso: null, endIso: null, error: "End time must be after start time." };
  }

  return { startIso: start.toISOString(), endIso: end.toISOString(), error: null };
}

function FilterSelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label htmlFor={id} className="block text-sm font-medium text-zinc-900">
      {label}
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-normal text-zinc-900 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
      >
        <option value="">Any</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function ProctorsPageContent() {
  const [proctorsData, setProctorsData] = useState<ProctorApiItem[]>([]);
  const [filterOptions, setFilterOptions] = useState<ProctorFilterOptions>(EMPTY_FILTER_OPTIONS);
  const [countryFilter, setCountryFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [professionFilter, setProfessionFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [minHourlyRate, setMinHourlyRate] = useState("");
  const [maxHourlyRate, setMaxHourlyRate] = useState("");
  const [minRating, setMinRating] = useState("");
  const [availabilityDate, setAvailabilityDate] = useState("");
  const [availabilityStartTime, setAvailabilityStartTime] = useState("");
  const [availabilityEndTime, setAvailabilityEndTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [filterOptionsLoading, setFilterOptionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previousCityFilter = useRef(cityFilter);
  const availabilityFilter = useMemo(
    () =>
      availabilityWindow(
        availabilityDate,
        availabilityStartTime,
        availabilityEndTime,
        cityFilter,
        filterOptions.cityTimeZone
      ),
    [availabilityDate, availabilityStartTime, availabilityEndTime, cityFilter, filterOptions.cityTimeZone]
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadFilterOptions() {
      setFilterOptionsLoading(true);
      try {
        const params = new URLSearchParams();
        if (countryFilter) params.set("country", countryFilter);
        if (stateFilter) params.set("state", stateFilter);
        if (cityFilter) params.set("city", cityFilter);
        if (professionFilter) params.set("profession", professionFilter);
        if (genderFilter) params.set("gender", genderFilter);

        const res = await fetch(`/api/proctors/filters${params.toString() ? `?${params.toString()}` : ""}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        setFilterOptions({
          countries: Array.isArray(data?.countries) ? data.countries : [],
          states: Array.isArray(data?.states) ? data.states : [],
          cities: Array.isArray(data?.cities) ? data.cities : [],
          professions: Array.isArray(data?.professions) ? data.professions : [],
          genders: Array.isArray(data?.genders) ? data.genders : [],
          hourlyRateMin: data?.hourlyRateMin == null ? null : Number(data.hourlyRateMin),
          hourlyRateMax: data?.hourlyRateMax == null ? null : Number(data.hourlyRateMax),
          cityTimeZone: typeof data?.cityTimeZone === "string" ? data.cityTimeZone : null,
        });
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setFilterOptions(EMPTY_FILTER_OPTIONS);
      } finally {
        if (!controller.signal.aborted) setFilterOptionsLoading(false);
      }
    }

    void loadFilterOptions();
    return () => controller.abort();
  }, [cityFilter, countryFilter, genderFilter, professionFilter, stateFilter]);

  useEffect(() => {
    if (countryFilter && !filterOptions.countries.includes(countryFilter)) setCountryFilter("");
    if (stateFilter && !filterOptions.states.includes(stateFilter)) setStateFilter("");
    if (cityFilter && !filterOptions.cities.includes(cityFilter)) setCityFilter("");
    if (professionFilter && !filterOptions.professions.includes(professionFilter)) setProfessionFilter("");
    if (genderFilter && !filterOptions.genders.includes(genderFilter)) setGenderFilter("");
  }, [cityFilter, countryFilter, filterOptions, genderFilter, professionFilter, stateFilter]);

  useEffect(() => {
    if (previousCityFilter.current === cityFilter) return;
    previousCityFilter.current = cityFilter;
    setAvailabilityDate("");
    setAvailabilityStartTime("");
    setAvailabilityEndTime("");
  }, [cityFilter]);

  useEffect(() => {
    const controller = new AbortController();

    const fetchProctors = async () => {
      if (availabilityFilter.error) {
        setError(availabilityFilter.error);
        setProctorsData([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (countryFilter) params.set("country", countryFilter);
        if (stateFilter) params.set("state", stateFilter);
        if (cityFilter) params.set("city", cityFilter);
        if (professionFilter) params.set("profession", professionFilter);
        if (genderFilter) params.set("gender", genderFilter);
        if (minHourlyRate) params.set("minRate", minHourlyRate);
        if (maxHourlyRate) params.set("maxRate", maxHourlyRate);
        if (minRating) params.set("minRating", minRating);
        if (availabilityFilter.startIso && availabilityFilter.endIso) {
          params.set("start", availabilityFilter.startIso);
          params.set("end", availabilityFilter.endIso);
        }

        const res = await fetch(`/api/proctors${params.toString() ? `?${params.toString()}` : ""}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
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
  }, [
    availabilityFilter,
    cityFilter,
    countryFilter,
    genderFilter,
    maxHourlyRate,
    minHourlyRate,
    minRating,
    professionFilter,
    stateFilter,
  ]);

  const proctors = useMemo<Proctor[]>(() => {
    return proctorsData.map((proctor) => ({
      slug: String(proctor.id),
      name: proctor.name ?? "",
      brand: proctor.credential ?? "",
      specialty: proctor.specialty ?? "Interview proctoring",
      imageUrl: Array.isArray(proctor.imageUrls) ? proctor.imageUrls[0] ?? "" : "",
      location: formatLocation(proctor),
      sessionWindow: proctor.sessionWindow ?? "90 min",
      price: proctor.rateUsd == null ? 0 : Number(proctor.rateUsd),
      ratingAverage: proctor.ratingAverage == null ? null : Number(proctor.ratingAverage),
      ratingCount: proctor.ratingCount == null ? 0 : Number(proctor.ratingCount),
    }));
  }, [proctorsData]);

  const resetFilters = () => {
    setCountryFilter("");
    setStateFilter("");
    setCityFilter("");
    setProfessionFilter("");
    setGenderFilter("");
    setMinHourlyRate("");
    setMaxHourlyRate("");
    setMinRating("");
    setAvailabilityDate("");
    setAvailabilityStartTime("");
    setAvailabilityEndTime("");
  };

  const ratePlaceholder =
    filterOptions.hourlyRateMin == null || filterOptions.hourlyRateMax == null
      ? "Any"
      : `${filterOptions.hourlyRateMin}-${filterOptions.hourlyRateMax}`;
  const timeZoneLabel = cityFilter && filterOptions.cityTimeZone ? `${cityFilter} local time (${filterOptions.cityTimeZone})` : "";
  const timeInputsDisabled = !cityFilter || !filterOptions.cityTimeZone;
  const timeZoneStatusText = !cityFilter
    ? "Choose a city before selecting a time."
    : filterOptionsLoading
      ? "Loading the selected city's timezone..."
      : timeZoneLabel
        ? `Choose ${timeZoneLabel}. It is converted to UTC for matching.`
        : "Timezone unavailable for this city. Check Google Maps API key, Geocoding API, Time Zone API, and billing.";

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

        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-lg border border-zinc-200 bg-white p-4 lg:sticky lg:top-6 lg:self-start">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-zinc-900">Filters</h2>
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:border-zinc-400"
              >
                Reset
              </button>
            </div>

            <div className="mt-4 grid gap-4">
              <FilterSelect
                id="proctor-country-filter"
                label="Country"
                value={countryFilter}
                options={filterOptions.countries}
                onChange={setCountryFilter}
              />
              <FilterSelect
                id="proctor-state-filter"
                label="State"
                value={stateFilter}
                options={filterOptions.states}
                onChange={setStateFilter}
              />
              <FilterSelect
                id="proctor-city-filter"
                label="City"
                value={cityFilter}
                options={filterOptions.cities}
                onChange={setCityFilter}
              />
              <FilterSelect
                id="proctor-profession-filter"
                label="Profession"
                value={professionFilter}
                options={filterOptions.professions}
                onChange={setProfessionFilter}
              />
              <FilterSelect
                id="proctor-gender-filter"
                label="Gender"
                value={genderFilter}
                options={filterOptions.genders}
                onChange={setGenderFilter}
              />

              <div className="grid grid-cols-2 gap-3">
                <label htmlFor="proctor-min-rate" className="block text-sm font-medium text-zinc-900">
                  Min rate
                  <input
                    id="proctor-min-rate"
                    type="number"
                    min="0"
                    inputMode="decimal"
                    value={minHourlyRate}
                    onChange={(event) => setMinHourlyRate(event.target.value)}
                    placeholder={ratePlaceholder}
                    className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-normal text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
                  />
                </label>
                <label htmlFor="proctor-max-rate" className="block text-sm font-medium text-zinc-900">
                  Max rate
                  <input
                    id="proctor-max-rate"
                    type="number"
                    min="0"
                    inputMode="decimal"
                    value={maxHourlyRate}
                    onChange={(event) => setMaxHourlyRate(event.target.value)}
                    placeholder={ratePlaceholder}
                    className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-normal text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
                  />
                </label>
              </div>

              <label htmlFor="proctor-rating-filter" className="block text-sm font-medium text-zinc-900">
                Rating
                <select
                  id="proctor-rating-filter"
                  value={minRating}
                  onChange={(event) => setMinRating(event.target.value)}
                  className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-normal text-zinc-900 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
                >
                  <option value="">Any</option>
                  <option value="4">4.0+</option>
                  <option value="3">3.0+</option>
                  <option value="2">2.0+</option>
                  <option value="1">1.0+</option>
                </select>
              </label>

              <div className="border-t border-zinc-100 pt-4">
                <div className="text-sm font-medium text-zinc-900">Available time</div>
                <div className="mt-1 text-xs leading-5 text-zinc-500">
                  {timeZoneStatusText}
                </div>
                <div className="mt-3 grid gap-3">
                  <label htmlFor="proctor-availability-date" className="block text-sm font-medium text-zinc-900">
                    Date
                    <input
                      id="proctor-availability-date"
                      type="date"
                      min={todayDateId()}
                      value={availabilityDate}
                      disabled={timeInputsDisabled}
                      onChange={(event) => setAvailabilityDate(event.target.value)}
                      className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-normal text-zinc-900 outline-none transition disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label htmlFor="proctor-availability-start" className="block text-sm font-medium text-zinc-900">
                      Start
                      <input
                        id="proctor-availability-start"
                        type="time"
                        value={availabilityStartTime}
                        disabled={timeInputsDisabled}
                        onChange={(event) => setAvailabilityStartTime(event.target.value)}
                        className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-normal text-zinc-900 outline-none transition disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
                      />
                    </label>
                    <label htmlFor="proctor-availability-end" className="block text-sm font-medium text-zinc-900">
                      End
                      <input
                        id="proctor-availability-end"
                        type="time"
                        value={availabilityEndTime}
                        disabled={timeInputsDisabled}
                        onChange={(event) => setAvailabilityEndTime(event.target.value)}
                        className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-normal text-zinc-900 outline-none transition disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="text-sm text-zinc-600">
                {loading ? "Loading..." : `${proctors.length} ${proctors.length === 1 ? "proctor" : "proctors"}`}
              </div>
            </div>
            {error ? <div className="mb-4 text-sm text-red-600">{error}</div> : null}

            <ProctorGrid proctors={proctors} />
          </section>
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
