"use client";

import React, { useMemo } from "react";
import { formatUsd } from "@/lib/formatters";

export type ProctorMaterial = {
  material: string;
  percentage: number | null;
};

export type ProctorEducation = {
  degree: string;
  school: string;
  major: string;
  startMonth: string | null;
  endMonth: string | null;
};

export type ProctorInfoPanelProctor = {
  description: string;
  educations: ProctorEducation[];
  hourlyRate: string | number | null;
  id: number;
  maximumHours: string | number | null;
  minimumHours: string | number | null;
  name: string;
  credential: string;
  profession: string;
  gender: string;
  materials: ProctorMaterial[];
};

export type ProctorInfoPanelProps = {
  proctor: ProctorInfoPanelProctor;
};

/**
 * Formats hour value for display.
 *
 * @param value - Input used by format hour value.
 *
 * @returns The formatted display value.
 */
function formatHourValue(value: string | number | null) {
  const parsed = value == null ? NaN : Number(value);
  if (!Number.isFinite(parsed)) return "Not set";
  return Number.isInteger(parsed) ? String(parsed) : parsed.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

/**
 * Formats month for display.
 *
 * @param value - Input used by format month.
 *
 * @returns The formatted display value.
 */
function formatMonth(value: string | null) {
  if (!value) return "Present";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(date);
}

/**
 * Renders the proctor info panel component.
 *
 * @param proctor - Input used by proctor info panel.
 *
 * @returns The rendered UI for this component.
 */
export default function ProctorInfoPanel({ proctor }: ProctorInfoPanelProps) {
  const priceUsdText = useMemo(() => {
    const usd = proctor.hourlyRate == null ? 0 : Number(proctor.hourlyRate);
    return formatUsd(usd);
  }, [proctor.hourlyRate]);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="border-b border-zinc-100 pb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">{proctor.name}</h1>
        {proctor.credential ? (
          <div className="mt-2 inline-flex rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600">
            {proctor.credential}
          </div>
        ) : null}
      </div>

      <div className="divide-y divide-zinc-100 text-sm">
        <section className="py-5">
          <h2 className="text-sm font-semibold text-zinc-950">Profession</h2>
          <div className="mt-2 leading-6 text-zinc-700">{proctor.profession}</div>
        </section>

        {proctor.gender ? (
          <section className="py-5">
            <h2 className="text-sm font-semibold text-zinc-950">Gender</h2>
            <div className="mt-2 leading-6 text-zinc-700">{proctor.gender}</div>
          </section>
        ) : null}

        <section className="py-5">
          <h2 className="text-sm font-semibold text-zinc-950">Education</h2>
          {proctor.educations.length > 0 ? (
            <div className="mt-3 space-y-4">
              {proctor.educations.map((education, index) => (
                <div
                  key={`${education.school}-${education.major}-${index}`}
                  className="grid gap-1 border-l-2 border-zinc-200 pl-3"
                >
                  <div className="font-medium leading-6 text-zinc-950">{education.degree}</div>
                  <div className="leading-6 text-zinc-700">{education.school}</div>
                  <div className="leading-6 text-zinc-700">{education.major}</div>
                  <div className="text-xs font-medium text-zinc-500">
                    {formatMonth(education.startMonth)} - {formatMonth(education.endMonth)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-2 leading-6 text-zinc-500">No education listed</div>
          )}
        </section>

        <section className="py-5">
          <h2 className="text-sm font-semibold text-zinc-950">Rate</h2>
          <dl className="mt-3 grid gap-3">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-zinc-500">Hourly rate</dt>
              <dd className="font-medium text-zinc-950">{priceUsdText}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-zinc-500">Minimum hours per session</dt>
              <dd className="font-medium text-zinc-950">{formatHourValue(proctor.minimumHours)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-zinc-500">Maximum hours per session</dt>
              <dd className="font-medium text-zinc-950">{formatHourValue(proctor.maximumHours)}</dd>
            </div>
          </dl>
        </section>
      </div>

      {Array.isArray(proctor.materials) && proctor.materials.length > 0 ? (
        <div className="mt-3 text-sm">
          <span className="text-zinc-500">Checks:</span>{" "}
          {proctor.materials
            .map((m) => (m.percentage == null ? m.material : `${m.material} ${m.percentage}% coverage`))
            .join(", ")}
        </div>
      ) : null}

      <div className="border-t border-zinc-100 pt-5">
        <h2 className="text-sm font-semibold text-zinc-950">Self-introduction</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-700">{proctor.description}</p>
      </div>
    </div>
  );
}
