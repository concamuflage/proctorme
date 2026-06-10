"use client";

import React, { useEffect, useMemo, useState } from "react";

export type BookingSlot = {
  id: string;
  dateId: string;
  dateLabel: string;
  dayLabel: string;
  index: number;
  startLabel: string;
  endLabel: string;
  startIso: string;
  endIso: string;
};

export type BookingSelection = {
  dateLabel: string;
  dayLabel: string;
  startLabel: string;
  endLabel: string;
  startIso: string;
  endIso: string;
  slotCount: number;
  slotIds: string[];
};

type Slot = BookingSlot & {
  available: boolean;
};

type CalendarDay = {
  id: string;
  dateLabel: string;
  dayLabel: string;
  slots: Slot[];
};

type ProctorBookingCalendarProps = {
  proctorId: number;
  timezone?: string;
  selection: BookingSelection | null;
  onSelectionChange: (selection: BookingSelection | null) => void;
};

const DAY_COUNT = 7;

/**
 * Runs the start of today logic for this module.
 *
 * @returns The result used by the surrounding flow.
 */
function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Runs the add days logic for this module.
 *
 * @param date - Input used by add days.
 * @param days - Input used by add days.
 *
 * @returns The result used by the surrounding flow.
 */
function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/**
 * Formats date id for display.
 *
 * @param date - Input used by format date id.
 *
 * @returns The formatted display value.
 */
function formatDateId(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Converts a value to selection.
 *
 * @param slots - Input used by to selection.
 *
 * @returns The result used by the surrounding flow.
 */
function toSelection(slots: Slot[]): BookingSelection | null {
  if (slots.length === 0) return null;
  const first = slots[0];
  const last = slots[slots.length - 1];

  return {
    dateLabel: first.dateLabel,
    dayLabel: first.dayLabel,
    startLabel: first.startLabel,
    endLabel: last.endLabel,
    startIso: first.startIso,
    endIso: last.endIso,
    slotCount: slots.length,
    slotIds: slots.map((slot) => slot.id),
  };
}

/**
 * Runs the selected slot ids logic for this module.
 *
 * @param selection - Input used by selected slot ids.
 *
 * @returns The result used by the surrounding flow.
 */
function selectedSlotIds(selection: BookingSelection | null) {
  return new Set(selection?.slotIds ?? []);
}

/**
 * Runs the selection can extend from logic for this module.
 *
 * @param selection - Input used by selection can extend from.
 * @param slot - Input used by selection can extend from.
 *
 * @returns The result used by the surrounding flow.
 */
function selectionCanExtendFrom(selection: BookingSelection | null, slot: Slot) {
  if (!selection || selection.slotIds.length === 0) return false;
  return slot.dateLabel === selection.dateLabel && slot.dayLabel === selection.dayLabel;
}

/**
 * Runs the select consecutive range logic for this module.
 *
 * @param day - Input used by select consecutive range.
 * @param slot - Input used by select consecutive range.
 * @param selection - Input used by select consecutive range.
 *
 * @returns The result used by the surrounding flow.
 */
function selectConsecutiveRange(day: CalendarDay, slot: Slot, selection: BookingSelection | null) {
  if (!slot.available) return selection;

  if (!selectionCanExtendFrom(selection, slot)) {
    return toSelection([slot]);
  }

  const selectedIds = selectedSlotIds(selection);
  const selectedIndexes = day.slots
    .filter((candidate) => selectedIds.has(candidate.id))
    .map((candidate) => candidate.index);
  if (selectedIndexes.length === 0) return toSelection([slot]);

  const anchorIndex = Math.min(...selectedIndexes);
  const rangeStart = Math.min(anchorIndex, slot.index);
  const rangeEnd = Math.max(anchorIndex, slot.index);
  const range = day.slots.slice(rangeStart, rangeEnd + 1);

  if (range.some((candidate) => !candidate.available)) {
    return toSelection([slot]);
  }

  return toSelection(range);
}

/**
 * Renders the proctor booking calendar component.
 *
 * @param proctorId,
  timezone = "Local time",
  selection,
  onSelectionChange, - Input used by proctor booking calendar.
 *
 * @returns The rendered UI for this component.
 */
export default function ProctorBookingCalendar({
  proctorId,
  timezone = "Local time",
  selection,
  onSelectionChange,
}: ProctorBookingCalendarProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [calendarTimezone, setCalendarTimezone] = useState(timezone);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startDate = useMemo(() => formatDateId(addDays(startOfToday(), weekOffset * DAY_COUNT)), [weekOffset]);
  const selectionIds = useMemo(() => selectedSlotIds(selection), [selection]);
  const durationText = selection
    ? `${selection.slotCount} ${selection.slotCount === 1 ? "hour" : "hours"} selected`
    : "Select a start time, then an adjacent end time";

  useEffect(() => {
    onSelectionChange(null);
  }, [onSelectionChange, startDate]);

  useEffect(() => {
    let cancelled = false;

    /**
     * Loads availability needed by this flow.
     *
     * @returns The result used by the surrounding flow.
     */
    async function loadAvailability() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/proctors/${proctorId}/availability?start=${encodeURIComponent(startDate)}&days=${DAY_COUNT}`,
          { cache: "no-store" }
        );
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || "Unable to load availability.");
        if (cancelled) return;

        setCalendarTimezone(typeof payload?.timezone === "string" ? payload.timezone : timezone);
        setDays(Array.isArray(payload?.days) ? payload.days : []);
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : "Unable to load availability.");
        setDays([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadAvailability();

    return () => {
      cancelled = true;
    };
  }, [proctorId, startDate, timezone]);

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4" aria-label="Booking calendar">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-zinc-900">Choose a time</h2>
          <div className="mt-1 text-xs text-zinc-500">{calendarTimezone} · {durationText}</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setWeekOffset((current) => Math.max(0, current - 1))}
            disabled={weekOffset === 0}
            className="h-9 w-9 rounded-full border border-zinc-200 text-sm disabled:cursor-not-allowed disabled:text-zinc-300 hover:border-zinc-400"
            aria-label="Previous week"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => setWeekOffset((current) => current + 1)}
            className="h-9 w-9 rounded-full border border-zinc-200 text-sm hover:border-zinc-400"
            aria-label="Next week"
          >
            ›
          </button>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto pb-1">
        <div className="grid min-w-[720px] grid-cols-7 gap-2">
          {days.map((day) => (
            <div key={day.id} className="min-w-0">
              <div className="rounded-lg bg-zinc-100 px-2 py-2 text-center">
                <div className="text-xs font-medium text-zinc-500">{day.dayLabel}</div>
                <div className="mt-0.5 text-sm font-semibold text-zinc-900">{day.dateLabel}</div>
              </div>
              <div className="mt-2 grid gap-2">
                {day.slots.map((slot) => {
                  const selected = selectionIds.has(slot.id);
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => {
                        if (slot.available) onSelectionChange(selectConsecutiveRange(day, slot, selection));
                      }}
                      className={
                        "h-10 rounded-md border px-2 text-xs font-medium transition " +
                        (selected
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : slot.available
                            ? "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-900"
                            : "cursor-not-allowed border-zinc-100 bg-zinc-50 text-zinc-300 line-through")
                      }
                      aria-pressed={selected}
                      aria-label={`${slot.dateLabel} ${slot.startLabel} to ${slot.endLabel}${
                        slot.available ? "" : " unavailable"
                      }`}
                    >
                      {slot.startLabel}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {loading ? <div className="mt-3 text-xs text-zinc-500">Loading availability...</div> : null}
      {error ? <div className="mt-3 text-xs text-red-600">{error}</div> : null}

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full border border-zinc-900 bg-white" />
          Available
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-900" />
          Selected
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-200" />
          Not available
        </span>
      </div>
    </section>
  );
}
