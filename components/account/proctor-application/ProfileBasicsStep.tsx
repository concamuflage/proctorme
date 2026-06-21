"use client";

import React from "react";
import { Field, FormSection, generateOptions } from "@/components/account/proctor-application/StepLayout";

type ProfileBasicsStepProps = {
  bio: string;
  dateOfBirth: string;
  ethnicity: string;
  ethnicityOptions: string[];
  gender: string;
  genderOptions: string[];
  inputClassName: string;
  onBioChange: (value: string) => void;
  onDateOfBirthChange: (value: string) => void;
  onEthnicityChange: (value: string) => void;
  onGenderChange: (value: string) => void;
  onProfessionChange: (value: string) => void;
  profession: string;
  professionOptions: string[];
};

/**
 * Renders Step 1 of the proctor application form.
 *
 * @param props - Profile basics state and change handlers, for example `profession="Accountant"` and `onProfessionChange("Teacher")`.
 * @returns The profile basics step UI; state changes are sent back to the parent component.
 */
export default function ProfileBasicsStep({
  bio,
  dateOfBirth,
  ethnicity,
  ethnicityOptions,
  gender,
  genderOptions,
  inputClassName,
  onBioChange,
  onDateOfBirthChange,
  onEthnicityChange,
  onGenderChange,
  onProfessionChange,
  profession,
  professionOptions,
}: ProfileBasicsStepProps) {
  return (
    <FormSection title="Profile basics">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="grid gap-3">
          <Field label="Profession">
            <select
              value={profession}
              onChange={(event) => onProfessionChange(event.target.value)}
              className={inputClassName}
              required
            >
              <option value="">Select a profession</option>
              {generateOptions(professionOptions)}
            </select>
          </Field>
        </div>
        <div className="grid gap-3">
          <Field label="Gender">
            <select
              value={gender}
              onChange={(event) => onGenderChange(event.target.value)}
              className={inputClassName}
              required
            >
              <option value="">Select a gender</option>
              {generateOptions(genderOptions)}
            </select>
          </Field>
        </div>
        <Field label="Date of birth">
          <input
            type="date"
            value={dateOfBirth}
            onChange={(event) => onDateOfBirthChange(event.target.value)}
            className={inputClassName}
            required
          />
        </Field>
        <Field label="Ethnicity">
          <select
            value={ethnicity}
            onChange={(event) => onEthnicityChange(event.target.value)}
            className={inputClassName}
            required
          >
            <option value="">Select ethnicity</option>
            {generateOptions(ethnicityOptions)}
          </select>
        </Field>
      </div>

      <Field label="Self-introduction">
        <textarea
          value={bio}
          onChange={(event) => onBioChange(event.target.value)}
          className={`${inputClassName} min-h-24 resize-y`}
          placeholder="Introduce yourself, your proctoring experience, exam environments, and strengths."
          required
        />
      </Field>
    </FormSection>
  );
}
