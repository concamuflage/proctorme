"use client";

import CurrentAddressStep from "@/components/account/proctor-application/CurrentAddressStep";
import EducationStep from "@/components/account/proctor-application/EducationStep";
import IdentityAndProfileMediaStep from "@/components/account/proctor-application/IdentityAndProfileMediaStep";
import ProfileBasicsStep from "@/components/account/proctor-application/ProfileBasicsStep";
import RatesAndSessionLengthStep from "@/components/account/proctor-application/RatesAndSessionLengthStep";
import { FORM_STEPS, INPUT_CLASS, useProctorApplicationForm } from "@/components/account/proctor-application/useProctorApplicationForm";
import AlertMessage from "@/components/ui/AlertMessage";
import { SITE_NAME } from "@/lib/proctor";

/**
 * Renders the proctor application wizard shell.
 *
 * The state, validation, uploads, and API calls live in `useProctorApplicationForm`; this component only decides
 * which step component to render. Example: when `form.activeStep` is `3`, this shell renders `EducationStep`.
 *
 * @returns The five-step proctor application UI.
 */
export default function ProctorApplicationClient() {
  const form = useProctorApplicationForm();

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-semibold">Proctor verification</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Provide the details shown on your public proctor profile. Your profile becomes bookable after admin approval.
          </p>

          {form.applicationStatus ? (
            <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
              Current application status: <span className="font-medium text-zinc-950">{form.applicationStatus}</span>
            </div>
          ) : null}

          <div className="mt-8">
            <div className="text-sm font-medium text-zinc-950">
              Step {form.activeStep + 1} of {FORM_STEPS.length}: {form.currentStepTitle}
            </div>
            <div className="mt-4 flex items-start" aria-label="Application progress">
              {FORM_STEPS.map((step, index) => (
                <div key={step} className="flex flex-1 items-start last:flex-none">
                  <div className="grid justify-items-center gap-2">
                    <div
                      className={`grid h-8 w-8 place-items-center rounded-full border text-xs font-semibold ${
                        index <= form.activeStep
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-300 bg-white text-zinc-500"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div className={`hidden max-w-24 text-center text-xs leading-4 sm:block ${index === form.activeStep ? "font-medium text-zinc-950" : "text-zinc-500"}`}>
                      {step}
                    </div>
                  </div>
                  {index < FORM_STEPS.length - 1 ? (
                    <div className={`mt-4 h-px flex-1 ${index < form.activeStep ? "bg-zinc-900" : "bg-zinc-200"}`} />
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <form className="mt-8 grid gap-6" onSubmit={form.handleSubmit}>
            {/* Keep step validation in one shared location. Example: an under-18 date of birth and a short bio both render here, not under individual fields. */}
            {form.error ? <AlertMessage role="alert" tone="error">{form.error}</AlertMessage> : null}
            {/* Render success feedback in the same message area as errors and warnings.
                Example: "Application submitted..." appears above the active step instead of below its fields. */}
            {form.notice ? <AlertMessage role="status" tone="success">{form.notice}</AlertMessage> : null}
            {/* Immediately after submission, the success notice already explains the pending state.
                Example: a newly submitted application shows only "Application submitted..."; after refresh, the generic pending warning appears instead. */}
            {form.isReadOnlyApplication && !form.isSubmitted ? (
              <AlertMessage role="status" tone="warning">
                This proctor application is {form.applicationStatus}. Edits are locked while it is pending review or already approved.
              </AlertMessage>
            ) : null}

            {/* Disable every form control in the active step when the application is pending or approved.
                Example: a pending application still displays Step 1 values, but the inputs and upload controls cannot change them. */}
            <fieldset disabled={form.isReadOnlyApplication} className="contents">
              {form.activeStep === 0 ? (
                <ProfileBasicsStep
                  bio={form.bio}
                  dateOfBirth={form.dateOfBirth}
                  ethnicity={form.ethnicity}
                  ethnicityOptions={form.ethnicityOptions}
                  gender={form.gender}
                  genderOptions={form.genderOptions}
                  inputClassName={INPUT_CLASS}
                  onBioChange={(value) => form.setFormValue("bio", value)}
                  onDateOfBirthChange={(value) => form.setFormValue("dateOfBirth", value)}
                  onEthnicityChange={(value) => form.setFormValue("ethnicity", value)}
                  onGenderChange={(value) => form.setFormValue("gender", value)}
                  onProfessionChange={(value) => form.setFormValue("profession", value)}
                  profession={form.profession}
                  professionOptions={form.professionOptions}
                />
              ) : null}

              {form.activeStep === 1 ? (
                <CurrentAddressStep
                  city={form.city}
                  cityOptions={form.cityOptions}
                  customCity={form.customCity}
                  inputClassName={INPUT_CLASS}
                  onCityChange={(value) => form.setFormValue("city", value)}
                  onCustomCityChange={(value) => form.setFormValue("customCity", value)}
                  onStateChange={form.updateAddressState}
                  onStreetChange={(value) => form.setFormValue("street", value)}
                  onTimezoneChange={(value) => form.setFormValue("timezone", value)}
                  onZipCodeChange={(value) => form.setFormValue("zipCode", value)}
                  state={form.stateValue}
                  stateOptions={form.stateOptions}
                  street={form.street}
                  timezone={form.timezone}
                  timezoneOptions={form.timezoneOptions}
                  zipCode={form.zipCode}
                />
              ) : null}

              {form.activeStep === 2 ? (
                <RatesAndSessionLengthStep
                  currency={form.currency}
                  hourlyRate={form.hourlyRate}
                  inputClassName={INPUT_CLASS}
                  maximumHours={form.maximumHours}
                  minimumHours={form.minimumHours}
                  onHourlyRateChange={(value) => form.setFormValue("hourlyRate", value)}
                  onMaximumHoursChange={(value) => form.setFormValue("maximumHours", value)}
                  onMinimumHoursChange={(value) => form.setFormValue("minimumHours", value)}
                />
              ) : null}

              {form.activeStep === 3 ? (
                <EducationStep
                  degreeOptions={form.degreeOptions}
                  education={form.education}
                  inputClassName={INPUT_CLASS}
                  majorOptions={form.majorOptions}
                  onAddEducation={form.addEducation}
                  onChange={form.updateEducation}
                  onDiplomaUpload={(index, file) => void form.uploadDiploma(index, file)}
                  onRemoveEducation={form.removeEducation}
                  onSendSchoolEmailVerification={(index) => void form.sendSchoolEmailVerification(index)}
                  schoolOptions={form.schoolOptions}
                  sendingSchoolEmailIndex={form.sendingSchoolEmailIndex}
                  siteName={SITE_NAME}
                  uploadingEducationIndex={form.uploadingEducationIndex}
                />
              ) : null}

              {form.activeStep === 4 ? (
                <IdentityAndProfileMediaStep
                  governmentIdUrls={form.governmentIdUrls}
                  imageUrls={form.imageUrls}
                  inputClassName={INPUT_CLASS}
                  onGovernmentIdUpload={(file) => void form.uploadGovernmentId(file)}
                  onProfileImageUpload={(file) => void form.uploadProfileImage(file)}
                  uploadingGovernmentId={form.uploadingGovernmentId}
                  uploadingProfileImage={form.uploadingProfileImage}
                />
              ) : null}
            </fieldset>

            {form.isReadOnlyApplication ? (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-5">
                <button
                  type="button"
                  onClick={form.goToPreviousStep}
                  disabled={form.activeStep === 0}
                  className="rounded-full border border-zinc-300 px-5 py-2 text-sm font-medium text-zinc-800 hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={form.goToNextReadOnlyStep}
                  disabled={form.isLastStep}
                  className="rounded-full border border-zinc-300 px-5 py-2 text-sm font-medium text-zinc-800 hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            ) : !form.isSubmitted ? (
              <div className="grid gap-5 border-t border-zinc-100 pt-5">
                {/* Keep the Education-specific action below the same divider that separates all step controls.
                    Example: on Step 4, the divider now appears before "Add education" instead of after it. */}
                {form.activeStep === 3 ? (
                  <button type="button" onClick={form.addEducation} className="w-fit rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium hover:border-zinc-500">
                    Add education
                  </button>
                ) : null}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={form.goToPreviousStep}
                    disabled={form.activeStep === 0 || form.loading || form.draftSaving}
                    className="rounded-full border border-zinc-300 px-5 py-2 text-sm font-medium text-zinc-800 hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Back
                  </button>
                  {form.isLastStep ? (
                    <button type="submit" disabled={form.loading || form.uploadingGovernmentId} className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-70">
                      {form.loading ? "Submitting..." : "Submit for admin review"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={form.continueToNextStep}
                      disabled={form.loading || form.draftSaving || form.uploadingEducationIndex !== null || form.uploadingProfileImage || form.uploadingGovernmentId}
                      className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-70"
                    >
                      {form.draftSaving ? "Saving..." : "Continue"}
                    </button>
                  )}
                </div>
              </div>
            ) : null}
          </form>
        </section>
      </main>
    </div>
  );
}
