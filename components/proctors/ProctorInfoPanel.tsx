"use client";

import React, { useMemo, type ReactNode } from "react";
import { formatUsd } from "@/lib/formatters";

export type ProctorMaterial = {
  material: string;
  percentage: number | null;
};

export type ProctorInfoPanelProctor = {
  assignmentCode: string;
  sessionWindow: string;
  coordinationUnits: number | null;
  description: string;
  id: number;
  name: string;
  credential: string;
  specialty: string;
  address: string;
  slotsAvailable: number | null;
  rateUsd: string | number | null;
  materials: ProctorMaterial[];
};

export type ProctorInfoPanelProps = {
  proctor: ProctorInfoPanelProctor;
  bookingDetails?: ReactNode;
};

export default function ProctorInfoPanel({ proctor, bookingDetails }: ProctorInfoPanelProps) {
  const priceUsdText = useMemo(() => {
    const usd = proctor.rateUsd == null ? 0 : Number(proctor.rateUsd);
    return formatUsd(usd);
  }, [proctor.rateUsd]);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{proctor.name}</h1>
      <div className="mt-1 text-base font-semibold text-zinc-700">{proctor.credential}</div>
      <div className="mt-3 text-lg font-semibold">{priceUsdText} per hour</div>
      {bookingDetails ? <div className="mt-6">{bookingDetails}</div> : null}

      <div className="mt-6 space-y-3 text-sm">
        <div>
          <span className="text-zinc-500">Assignment type:</span> {proctor.specialty}
        </div>
        <div>
          <span className="text-zinc-500">Location setup:</span> {proctor.address}
        </div>
        <div>
          <span className="text-zinc-500">Hours:</span> {proctor.sessionWindow}
        </div>
        <div>
          <span className="text-zinc-500">Coordination units:</span>{" "}
          {proctor.coordinationUnits == null ? "Standard" : proctor.coordinationUnits.toFixed(2)}
        </div>
        <div>
          <span className="text-zinc-500">Assignment code:</span> {proctor.assignmentCode}
        </div>
        <div>
          <span className="text-zinc-500">Open slots:</span> {proctor.slotsAvailable ?? "Contact us"}
        </div>
      </div>

      {Array.isArray(proctor.materials) && proctor.materials.length > 0 ? (
        <div className="mt-3 text-sm">
          <span className="text-zinc-500">Checks:</span>{" "}
          {proctor.materials
            .map((m) => (m.percentage == null ? m.material : `${m.material} ${m.percentage}% coverage`))
            .join(", ")}
        </div>
      ) : null}

      {/* Description */}
      <div className="mt-8">
        <h2 className="text-base font-medium">Description</h2>
        <p className="mt-2 text-sm leading-6 text-zinc-700">{proctor.description}</p>
      </div>

    </div>
  );
}
