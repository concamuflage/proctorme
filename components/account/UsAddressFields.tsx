"use client";

import React from "react";

export type UsStateOption = {
  name: string;
  code: string;
};

type UsAddressFieldsProps = {
  city: string;
  cityOptions: string[];
  country?: string;
  customCity: string;
  gridClassName?: string;
  inputClassName: string;
  onCityChange: (value: string) => void;
  onCustomCityChange: (value: string) => void;
  onStateChange: (value: string) => void;
  onStreetChange: (value: string) => void;
  onZipCodeChange: (value: string) => void;
  state: string;
  stateOptions: UsStateOption[];
  street: string;
  streetFieldClassName?: string;
  zipCode: string;
};

/**
 * Renders the field component.
 *
 * @param label, children, className = "" - Input used by field.
 *
 * @returns The rendered UI for this component.
 */
function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`grid gap-2 text-sm font-medium text-zinc-700 ${className}`}>
      {label}
      {children}
    </label>
  );
}

/**
 * Renders the us address fields component.
 *
 * @param city,
  cityOptions,
  country = "United States",
  customCity,
  gridClassName = "grid gap-4 md:grid-cols-4",
  inputClassName,
  onCityChange,
  onCustomCityChange,
  onStateChange,
  onStreetChange,
  onZipCodeChange,
  state,
  stateOptions,
  street,
  streetFieldClassName = "md:col-span-2",
  zipCode, - Input used by us address fields.
 *
 * @returns The rendered UI for this component.
 */
export default function UsAddressFields({
  city,
  cityOptions,
  country = "United States",
  customCity,
  gridClassName = "grid gap-4 md:grid-cols-4",
  inputClassName,
  onCityChange,
  onCustomCityChange,
  onStateChange,
  onStreetChange,
  onZipCodeChange,
  state,
  stateOptions,
  street,
  streetFieldClassName = "md:col-span-2",
  zipCode,
}: UsAddressFieldsProps) {
  const hasOtherOption = cityOptions.includes("Other");

  return (
    <div className={gridClassName}>
      <Field label="Street address" className={streetFieldClassName}>
        <input value={street} onChange={(event) => onStreetChange(event.target.value)} className={inputClassName} required />
      </Field>

      <div className={`grid gap-3 ${city === "Other" ? "grid-cols-2 md:col-span-2" : ""}`}>
        <Field label="City">
          <select value={city} onChange={(event) => onCityChange(event.target.value)} className={inputClassName} required disabled={!state}>
            <option value="">{state ? "Select a city" : "Select a state first"}</option>
            {cityOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
            {!hasOtherOption ? <option value="Other">Other</option> : null}
          </select>
        </Field>
        {city === "Other" ? (
          <Field label="Your city">
            <input
              value={customCity}
              onChange={(event) => onCustomCityChange(event.target.value)}
              className={inputClassName}
              placeholder="Enter your city"
              required
            />
          </Field>
        ) : null}
      </div>

      <Field label="State">
        <select
          value={state}
          onChange={(event) => onStateChange(event.target.value)}
          className={inputClassName}
          required
        >
          <option value="">Select a state</option>
          {stateOptions.map((option) => (
            <option key={option.code} value={option.code}>
              {option.name} ({option.code})
            </option>
          ))}
        </select>
      </Field>

      <Field label="Zip code">
        <input value={zipCode} onChange={(event) => onZipCodeChange(event.target.value)} className={inputClassName} required />
      </Field>

      <Field label="Country">
        <input value={country} className={`${inputClassName} bg-zinc-50 text-zinc-600`} readOnly />
      </Field>
    </div>
  );
}
