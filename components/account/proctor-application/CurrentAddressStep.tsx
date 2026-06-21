"use client";

import React from "react";
import UsAddressFields, { type UsStateOption } from "@/components/account/UsAddressFields";
import { Field, FormSection, generateOptions } from "@/components/account/proctor-application/StepLayout";

type CurrentAddressStepProps = {
  city: string;
  cityOptions: string[];
  customCity: string;
  inputClassName: string;
  onCityChange: (value: string) => void;
  onCustomCityChange: (value: string) => void;
  onStateChange: (value: string) => void;
  onStreetChange: (value: string) => void;
  onTimezoneChange: (value: string) => void;
  onZipCodeChange: (value: string) => void;
  state: string;
  stateOptions: UsStateOption[];
  street: string;
  timezone: string;
  timezoneOptions: string[];
  zipCode: string;
};

/**
 * Renders Step 2 of the proctor application form.
 *
 * @param props - Current address state and callbacks, for example `state="CA"` and `onStateChange("NY")`.
 * @returns The current address step UI; all state updates are delegated to the parent component.
 */
export default function CurrentAddressStep({
  city,
  cityOptions,
  customCity,
  inputClassName,
  onCityChange,
  onCustomCityChange,
  onStateChange,
  onStreetChange,
  onTimezoneChange,
  onZipCodeChange,
  state,
  stateOptions,
  street,
  timezone,
  timezoneOptions,
  zipCode,
}: CurrentAddressStepProps) {
  return (
    <FormSection title="Current address">
      <UsAddressFields
        city={city}
        cityOptions={cityOptions}
        customCity={customCity}
        inputClassName={inputClassName}
        onCityChange={onCityChange}
        onCustomCityChange={onCustomCityChange}
        onStateChange={onStateChange}
        onStreetChange={onStreetChange}
        onZipCodeChange={onZipCodeChange}
        state={state}
        stateOptions={stateOptions}
        street={street}
        zipCode={zipCode}
      />
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Field label="IANA timezone">
          <select
            value={timezone}
            onChange={(event) => onTimezoneChange(event.target.value)}
            className={inputClassName}
            required
          >
            <option value="">Select a timezone</option>
            {generateOptions(timezoneOptions)}
          </select>
        </Field>
      </div>
    </FormSection>
  );
}
