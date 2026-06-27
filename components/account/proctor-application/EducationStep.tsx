"use client";

import React from "react";
import EducationFields from "@/components/account/EducationFields";
import { FormSection } from "@/components/account/proctor-application/StepLayout";
import type { EducationInput } from "@/components/account/proctor-application/formTypes";

type EducationStepProps = {
  degreeOptions: string[];
  education: EducationInput[];
  inputClassName: string;
  majorOptions: string[];
  onAddEducation: () => void;
  onChange: <Field extends keyof EducationInput>(index: number, field: Field, value: EducationInput[Field]) => void;
  onDiplomaUpload: (index: number, file: File | null) => void;
  onRemoveEducation: (index: number) => void;
  onSendSchoolEmailVerification: (index: number) => void;
  schoolOptions: string[];
  sendingSchoolEmailIndex: number | null;
  siteName: string;
  uploadingEducationIndex: number | null;
};

/**
 * Renders Step 4 of the proctor application form.
 *
 * @param props - Education rows, option lists, and callbacks, for example `education[0].diplomaUrl="gcs://bucket/path.pdf"`.
 * @returns The education step UI while parent state controls every row mutation.
 */
export default function EducationStep({
  degreeOptions,
  education,
  inputClassName,
  majorOptions,
  onAddEducation,
  onChange,
  onDiplomaUpload,
  onRemoveEducation,
  onSendSchoolEmailVerification,
  schoolOptions,
  sendingSchoolEmailIndex,
  siteName,
  uploadingEducationIndex,
}: EducationStepProps) {
  return (
    <FormSection title="Education">
      <EducationFields
        degreeOptions={degreeOptions}
        education={education}
        inputClassName={inputClassName}
        majorOptions={majorOptions}
        onAddEducation={onAddEducation}
        onChange={onChange}
        onDiplomaUpload={onDiplomaUpload}
        onRemoveEducation={onRemoveEducation}
        onSendSchoolEmailVerification={onSendSchoolEmailVerification}
        schoolOptions={schoolOptions}
        sendingSchoolEmailIndex={sendingSchoolEmailIndex}
        showAddEducationButton={false}
        siteName={siteName}
        uploadingEducationIndex={uploadingEducationIndex}
      />
    </FormSection>
  );
}
