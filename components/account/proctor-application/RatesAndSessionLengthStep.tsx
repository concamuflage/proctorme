"use client";

import React from "react";
import { Field, FormSection } from "@/components/account/proctor-application/StepLayout";

type CurrencyDisplay = {
  code: string;
  symbol: string;
};

type RatesAndSessionLengthStepProps = {
  currency: CurrencyDisplay;
  hourlyRate: string;
  inputClassName: string;
  maximumHours: string;
  minimumHours: string;
  onHourlyRateChange: (value: string) => void;
  onMaximumHoursChange: (value: string) => void;
  onMinimumHoursChange: (value: string) => void;
};

/**
 * Renders Step 3 of the proctor application form.
 *
 * @param props - Rate and session-length values, for example `hourlyRate="25"` and `currency.code="USD"`.
 * @returns The rates and session length step UI with parent-owned change handlers.
 */
export default function RatesAndSessionLengthStep({
  currency,
  hourlyRate,
  inputClassName,
  maximumHours,
  minimumHours,
  onHourlyRateChange,
  onMaximumHoursChange,
  onMinimumHoursChange,
}: RatesAndSessionLengthStepProps) {
  return (
    <FormSection title="Rates and session length">
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Hourly rate">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
              {currency.symbol}
            </span>
            <input
              type="number"
              min="1"
              step="1"
              value={hourlyRate}
              onChange={(event) => onHourlyRateChange(event.target.value)}
              className={`${inputClassName} pl-7 pr-14`}
              aria-label={`Hourly rate in ${currency.code}`}
              required
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-zinc-500">
              {currency.code}
            </span>
          </div>
        </Field>
        <Field label="Minimum hours per session">
          <input
            type="number"
            min="0.5"
            step="0.5"
            value={minimumHours}
            onChange={(event) => onMinimumHoursChange(event.target.value)}
            className={inputClassName}
            required
          />
        </Field>
        <Field label="Maximum hours per session">
          <input
            type="number"
            min="0.5"
            step="0.5"
            value={maximumHours}
            onChange={(event) => onMaximumHoursChange(event.target.value)}
            className={inputClassName}
            required
          />
        </Field>
      </div>
    </FormSection>
  );
}
