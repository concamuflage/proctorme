"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import EducationFields, { EMPTY_EDUCATION, type EducationInput } from "@/components/account/EducationFields";
import UsAddressFields from "@/components/account/UsAddressFields";
import { SITE_NAME } from "@/lib/proctor";

type StateOption = {
  name: string;
  code: string;
};

const FORM_STEPS = [
  "Profile basics",
  "Current address",
  "Rates and session length",
  "Education",
  "Identity and profile media",
] as const;

const INPUT_CLASS = "w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900";
const MAX_DIPLOMA_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_DIPLOMA_FILE_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);
const COUNTRY_CURRENCY = {
  "United States": {
    code: "USD",
    symbol: "$",
  },
} as const;

/**
 * Runs the profile image href logic for this module.
 *
 * @param url - Input used by profile image href.
 *
 * @returns The result used by the surrounding flow.
 */
function profileImageHref(url: string) {
  return url.startsWith("gcs://")
    ? `/api/account/proctor-application/profile-image-file?url=${encodeURIComponent(url)}`
    : url;
}

/**
 * Runs the government id href logic for this module.
 *
 * @param url - Input used by government id href.
 *
 * @returns The result used by the surrounding flow.
 */
function governmentIdHref(url: string) {
  return url.startsWith("gcs://")
    ? `/api/account/proctor-application/government-id-file?url=${encodeURIComponent(url)}`
    : url;
}

/**
 * Checks whether at least age is true for this flow.
 *
 * @param dateOfBirth - Input used by is at least age.
 * @param age - Input used by is at least age.
 *
 * @returns True when the value satisfies the check.
 */
function isAtLeastAge(dateOfBirth: string, age: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) return false;
  const [year, month, day] = dateOfBirth.split("-").map(Number);
  const birthDate = new Date(Date.UTC(year, month - 1, day));
  if (!Number.isFinite(birthDate.getTime())) return false;

  const today = new Date();
  const threshold = new Date(Date.UTC(today.getUTCFullYear() - age, today.getUTCMonth(), today.getUTCDate()));
  return birthDate.getTime() <= threshold.getTime();
}

/**
 * Renders the proctor application client component.
 *
 * @returns The rendered UI for this component.
 */
export default function ProctorApplicationClient() {
  const router = useRouter();
  const { status } = useSession();
  const [profession, setProfession] = useState("");
  const [gender, setGender] = useState("");
  const [customGender, setCustomGender] = useState("");
  const [ethnicity, setEthnicity] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [professionOptions, setProfessionOptions] = useState<string[]>([]);
  const [genderOptions, setGenderOptions] = useState<string[]>([]);
  const [ethnicityOptions, setEthnicityOptions] = useState<string[]>([]);
  const [stateOptions, setStateOptions] = useState<StateOption[]>([]);
  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const [timezoneOptions, setTimezoneOptions] = useState<string[]>([]);
  const [degreeOptions, setDegreeOptions] = useState<string[]>([]);
  const [schoolOptions, setSchoolOptions] = useState<string[]>([]);
  const [majorOptions, setMajorOptions] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [customCity, setCustomCity] = useState("");
  const [stateValue, setStateValue] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [timezone, setTimezone] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [minimumHours, setMinimumHours] = useState("1");
  const [maximumHours, setMaximumHours] = useState("2");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [governmentIdUrls, setGovernmentIdUrls] = useState<string[]>([]);
  const [education, setEducation] = useState<EducationInput[]>([{ ...EMPTY_EDUCATION }]);
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [draftSaving, setDraftSaving] = useState(false);
  const [uploadingEducationIndex, setUploadingEducationIndex] = useState<number | null>(null);
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false);
  const [uploadingGovernmentId, setUploadingGovernmentId] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const currency = COUNTRY_CURRENCY["United States"];
  const isUnder18 = dateOfBirth ? !isAtLeastAge(dateOfBirth, 18) : false;
  const isCustomGender = gender === "Other";
  const currentStepTitle = FORM_STEPS[activeStep];
  const isLastStep = activeStep === FORM_STEPS.length - 1;
  const isSubmitted = applicationStatus === "pending" && Boolean(notice);

  useEffect(() => {
    if (status === "loading") return;
    if (status !== "authenticated") {
      router.replace(`/login?callbackUrl=${encodeURIComponent("/account/proctor-verification")}`);
      return;
    }

    let cancelled = false;
    /**
     * Loads application needed by this flow.
     *
     * @returns The result used by the surrounding flow.
     */
    async function loadApplication() {
      const [applicationResponse, optionsResponse] = await Promise.all([
        fetch("/api/account/proctor-application", { cache: "no-store" }),
        fetch("/api/account/proctor-application/options", { cache: "no-store" }),
      ]);
      const [payload, optionsPayload] = await Promise.all([
        applicationResponse.json().catch(() => null),
        optionsResponse.json().catch(() => null),
      ]);
      if (cancelled) return;
      if (optionsResponse.ok) {
        setProfessionOptions(Array.isArray(optionsPayload?.professions) ? optionsPayload.professions : []);
        setGenderOptions(Array.isArray(optionsPayload?.genders) ? optionsPayload.genders : []);
        setEthnicityOptions(Array.isArray(optionsPayload?.ethnicities) ? optionsPayload.ethnicities : []);
        setStateOptions(Array.isArray(optionsPayload?.states) ? optionsPayload.states : []);
        setTimezoneOptions(Array.isArray(optionsPayload?.timezones) ? optionsPayload.timezones : []);
        setDegreeOptions(Array.isArray(optionsPayload?.degrees) ? optionsPayload.degrees : []);
        setSchoolOptions(Array.isArray(optionsPayload?.schools) ? optionsPayload.schools : []);
        setMajorOptions(Array.isArray(optionsPayload?.majors) ? optionsPayload.majors : []);
      }
      setDateOfBirth(typeof payload?.dateOfBirth === "string" ? payload.dateOfBirth : "");
      if (!applicationResponse.ok || !payload?.application) return;
      const app = payload.application;
      setApplicationStatus(app.status === "draft" ? null : app.status ?? null);
      setDateOfBirth(typeof app.dateOfBirth === "string" ? app.dateOfBirth : typeof payload?.dateOfBirth === "string" ? payload.dateOfBirth : "");
      const savedProfession = typeof app.profession === "string" ? app.profession : "";
      const professionChoices = Array.isArray(optionsPayload?.professions) ? optionsPayload.professions : [];
      setProfession(savedProfession && professionChoices.includes(savedProfession) ? savedProfession : "");
      const savedGender = typeof app.gender === "string" ? app.gender : "";
      const genderChoices = Array.isArray(optionsPayload?.genders) ? optionsPayload.genders : [];
      if (savedGender && genderChoices.length > 0 && !genderChoices.includes(savedGender)) {
        setGender("Other");
        setCustomGender(savedGender);
      } else {
        setGender(savedGender);
        setCustomGender("");
      }
      setBio(app.bio ?? "");
      setStreet(app.street ?? "");
      setCity(app.city ?? "");
      setStateValue(app.state ?? "");
      setZipCode(app.zipCode ?? "");
      setTimezone(app.timezone ?? "");
      setHourlyRate(app.hourlyRate == null ? "" : String(app.hourlyRate));
      setMinimumHours(app.minimumHours == null ? "1" : String(app.minimumHours));
      setMaximumHours(app.maximumHours == null ? "2" : String(app.maximumHours));
      setImageUrls(Array.isArray(app.imageUrls) ? app.imageUrls : []);
      setGovernmentIdUrls(Array.isArray(app.governmentIdUrls) ? app.governmentIdUrls : []);
      setEthnicity(typeof app.ethnicity === "string" ? app.ethnicity : "");
      setEducation(
        Array.isArray(app.education) && app.education.length > 0
          ? app.education.map((item: Partial<EducationInput>) => ({
            ...EMPTY_EDUCATION,
            ...item,
            degree: item.degree && Array.isArray(optionsPayload?.degrees) && optionsPayload.degrees.includes(item.degree) ? item.degree : "",
            school: item.school && Array.isArray(optionsPayload?.schools) && !optionsPayload.schools.includes(item.school) ? "Other" : item.school ?? "",
            customSchool: item.school && Array.isArray(optionsPayload?.schools) && !optionsPayload.schools.includes(item.school) ? item.school : "",
            major: item.major && Array.isArray(optionsPayload?.majors) && !optionsPayload.majors.includes(item.major) ? "Other" : item.major ?? "",
            customMajor: item.major && Array.isArray(optionsPayload?.majors) && !optionsPayload.majors.includes(item.major) ? item.major : "",
          }))
          : [{ ...EMPTY_EDUCATION }]
      );
    }

    void loadApplication();
    return () => {
      cancelled = true;
    };
  }, [router, status]);

  useEffect(() => {
    if (status !== "authenticated" || !stateValue) {
      setCityOptions([]);
      return;
    }

    let cancelled = false;
    /**
     * Loads cities needed by this flow.
     *
     * @returns The result used by the surrounding flow.
     */
    async function loadCities() {
      const response = await fetch(`/api/account/proctor-application/options?state=${encodeURIComponent(stateValue)}`, { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (cancelled || !response.ok) return;
      setCityOptions(Array.isArray(payload?.cities) ? payload.cities : []);
    }

    void loadCities();
    return () => {
      cancelled = true;
    };
  }, [stateValue, status]);

  useEffect(() => {
    if (!city || city === "Other" || cityOptions.length === 0) return;
    if (!cityOptions.includes(city)) {
      setCustomCity(city);
      setCity("Other");
    }
  }, [city, cityOptions]);

  /**
   * Updates education while preserving the surrounding form state.
   *
   * @param index - Input used by update education.
   * @param field - Input used by update education.
   * @param value - Input used by update education.
   *
   * @returns The result used by the surrounding flow.
   */
  const updateEducation = (index: number, field: keyof EducationInput, value: string) => {
    setEducation((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  };

  /**
   * Updates education boolean while preserving the surrounding form state.
   *
   * @param index - Input used by update education boolean.
   * @param field - Input used by update education boolean.
   * @param value - Input used by update education boolean.
   *
   * @returns The result used by the surrounding flow.
   */
  const updateEducationBoolean = (index: number, field: "educationVerificationAuthorized", value: boolean) => {
    setEducation((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  };

  /**
   * Runs the upload diploma logic for this module.
   *
   * @param index - Input used by upload diploma.
   * @param file - Input used by upload diploma.
   *
   * @returns The result used by the surrounding flow.
   */
  const uploadDiploma = async (index: number, file: File | null) => {
    if (!file) return;
    setError(null);
    if (!ALLOWED_DIPLOMA_FILE_TYPES.has(file.type)) {
      setError("Diploma must be a PDF, JPG, JPEG, or PNG file.");
      return;
    }
    if (file.size <= 0 || file.size > MAX_DIPLOMA_FILE_BYTES) {
      setError("Diploma file must be 5 MB or smaller.");
      return;
    }
    setUploadingEducationIndex(index);
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/account/proctor-application/diploma-upload", {
      method: "POST",
      body: formData,
    });
    const payload = await response.json().catch(() => null);
    setUploadingEducationIndex(null);
    if (!response.ok || typeof payload?.url !== "string") {
      setError(payload?.error ?? "Unable to upload diploma.");
      return;
    }
    setEducation((current) => current.map((item, itemIndex) =>
      itemIndex === index ? { ...item, diplomaUrls: [...item.diplomaUrls, payload.url] } : item
    ));
  };

  /**
   * Runs the upload profile image logic for this module.
   *
   * @param file - Input used by upload profile image.
   *
   * @returns The result used by the surrounding flow.
   */
  const uploadProfileImage = async (file: File | null) => {
    if (!file) return;
    setError(null);
    setUploadingProfileImage(true);
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/account/proctor-application/profile-image-upload", {
      method: "POST",
      body: formData,
    });
    const payload = await response.json().catch(() => null);
    setUploadingProfileImage(false);
    if (!response.ok || typeof payload?.url !== "string") {
      setError(payload?.error ?? "Unable to upload profile image.");
      return;
    }
    setImageUrls((current) => [...current, payload.url]);
  };

  /**
   * Runs the upload government id logic for this module.
   *
   * @param file - Input used by upload government id.
   *
   * @returns The result used by the surrounding flow.
   */
  const uploadGovernmentId = async (file: File | null) => {
    if (!file) return;
    setError(null);
    if (!ALLOWED_DIPLOMA_FILE_TYPES.has(file.type)) {
      setError("Government ID must be a PDF, JPG, JPEG, or PNG file.");
      return;
    }
    if (file.size <= 0 || file.size > MAX_DIPLOMA_FILE_BYTES) {
      setError("Government ID file must be 5 MB or smaller.");
      return;
    }
    setUploadingGovernmentId(true);
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/account/proctor-application/government-id-upload", {
      method: "POST",
      body: formData,
    });
    const payload = await response.json().catch(() => null);
    setUploadingGovernmentId(false);
    if (!response.ok || typeof payload?.url !== "string") {
      setError(payload?.error ?? "Unable to upload government ID.");
      return;
    }
    setGovernmentIdUrls((current) => [...current, payload.url]);
  };

  /**
   * Runs the validate active step logic for this module.
   *
   * @returns The result used by the surrounding flow.
   */
  const validateActiveStep = () => {
    const resolvedGender = isCustomGender ? customGender.trim() : gender;
    const resolvedCity = city === "Other" ? customCity.trim() : city;
    const minHours = Number(minimumHours);
    const maxHours = Number(maximumHours);

    if (activeStep === 0) {
      if (!profession) return "Profession is required.";
      if (!resolvedGender) return "Gender is required.";
      if (!ethnicity) return "Ethnicity is required.";
      if (!dateOfBirth) return "Date of birth is required.";
      if (!isAtLeastAge(dateOfBirth, 18)) return "You must be at least 18 years old to apply as a proctor.";
      if (!bio.trim() || bio.trim().length < 40) return "Self-introduction must be at least 40 characters.";
      return null;
    }

    if (activeStep === 1) {
      if (!street.trim() || !resolvedCity || !stateValue || !zipCode.trim()) return "Current address is required.";
      if (!timezone) return "IANA timezone is required.";
      return null;
    }

    if (activeStep === 2) {
      const parsedHourlyRate = Number(hourlyRate);
      if (!Number.isFinite(parsedHourlyRate) || parsedHourlyRate <= 0) return "Hourly rate must be greater than zero.";
      if (!Number.isInteger(parsedHourlyRate)) return "Hourly rate must be a whole dollar amount.";
      if (!Number.isFinite(minHours) || !Number.isFinite(maxHours) || maxHours < minHours) return "Session hours are invalid.";
      return null;
    }

    if (activeStep === 3) {
      if (education.length === 0) return "At least one education entry is required.";
      for (const item of education) {
        const school = item.school === "Other" ? item.customSchool.trim() : item.school;
        const major = item.major === "Other" ? item.customMajor.trim() : item.major;
        if (!item.degree || !school || !major) return "Degree, school, and major are required for each education entry.";
        if (item.diplomaUrls.length === 0) return "A diploma upload is required for each education entry.";
        if (!item.educationVerificationAuthorized) return "Education verification authorization is required for each education entry.";
      }
      return null;
    }

    if (activeStep === 4) {
      if (governmentIdUrls.length === 0) return "A government-issued ID upload is required.";
      if (imageUrls.length === 0) return "At least one profile image is required.";
    }

    return null;
  };

  /**
   * Builds application payload for this flow.
   *
   * @returns The result used by the surrounding flow.
   */
  const buildApplicationPayload = () => {
    const resolvedGender = gender === "Other" ? customGender.trim() : gender;
    const resolvedCity = city === "Other" ? customCity.trim() : city;
    const resolvedEducation = education.map((item) => ({
      degree: item.degree,
      school: item.school === "Other" ? item.customSchool.trim() : item.school,
      major: item.major === "Other" ? item.customMajor.trim() : item.major,
      startMonth: item.startMonth,
      endMonth: item.endMonth,
      diplomaUrls: item.diplomaUrls,
      schoolEmail: item.schoolEmail.trim(),
      educationVerificationAuthorized: item.educationVerificationAuthorized,
      schoolEmailVerificationStatus: item.schoolEmailVerificationStatus,
    }));

    return {
      profession,
      gender: resolvedGender,
      ethnicity,
      dateOfBirth,
      bio,
      street,
      city: resolvedCity,
      state: stateValue,
      country: "United States",
      zipCode,
      timezone,
      hourlyRate: Number(hourlyRate),
      minimumHours: Number(minimumHours),
      maximumHours: Number(maximumHours),
      education: resolvedEducation,
      imageUrls,
      governmentIdUrls,
    };
  };

  /**
   * Runs the continue to next step logic for this module.
   *
   * @returns The result used by the surrounding flow.
   */
  const continueToNextStep = async () => {
    setError(null);
    setNotice(null);
    const validationError = validateActiveStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    setDraftSaving(true);
    const response = await fetch("/api/account/proctor-application", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildApplicationPayload()),
    });
    const payload = await response.json().catch(() => null);
    setDraftSaving(false);
    if (!response.ok) {
      setError(payload?.error ?? "Unable to save this section.");
      return;
    }
    setActiveStep((current) => Math.min(current + 1, FORM_STEPS.length - 1));
  };

  /**
   * Handles submit for this component.
   *
   * @param event - Input used by handle submit.
   *
   * @returns The result used by the surrounding flow.
   */
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    const validationError = validateActiveStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    setLoading(true);
    if (!isAtLeastAge(dateOfBirth, 18)) {
      setError("You must be at least 18 years old to apply as a proctor.");
      setLoading(false);
      return;
    }
    const response = await fetch("/api/account/proctor-application", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildApplicationPayload()),
    });
    const payload = await response.json().catch(() => null);
    setLoading(false);

    if (!response.ok) {
      setError(payload?.error ?? "Unable to submit application.");
      return;
    }

    setApplicationStatus(payload?.application?.status ?? "pending");
    setNotice("Application submitted. An admin will review your materials before your proctor profile is approved.");
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-semibold">Proctor verification</h1>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Provide the details shown on your public proctor profile. Your profile becomes bookable after admin approval.
          </p>

          {applicationStatus ? (
            <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
              Current application status: <span className="font-medium text-zinc-950">{applicationStatus}</span>
            </div>
          ) : null}

          <div className="mt-8">
            <div className="text-sm font-medium text-zinc-950">
              Step {activeStep + 1} of {FORM_STEPS.length}: {currentStepTitle}
            </div>
            <div className="mt-4 flex items-start" aria-label="Application progress">
              {FORM_STEPS.map((step, index) => (
                <div key={step} className="flex flex-1 items-start last:flex-none">
                  <div className="grid justify-items-center gap-2">
                    <div
                      className={`grid h-8 w-8 place-items-center rounded-full border text-xs font-semibold ${
                        index <= activeStep
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-300 bg-white text-zinc-500"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div className={`hidden max-w-24 text-center text-xs leading-4 sm:block ${index === activeStep ? "font-medium text-zinc-950" : "text-zinc-500"}`}>
                      {step}
                    </div>
                  </div>
                  {index < FORM_STEPS.length - 1 ? (
                    <div className={`mt-4 h-px flex-1 ${index < activeStep ? "bg-zinc-900" : "bg-zinc-200"}`} />
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <form className="mt-8 grid gap-6" onSubmit={handleSubmit}>
            {activeStep === 0 ? (
            <FormSection title="Profile basics">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="grid gap-3">
                  <Field label="Profession">
                    <select
                      value={profession}
                      onChange={(e) => setProfession(e.target.value)}
                      className={INPUT_CLASS}
                      required
                    >
                      <option value="">Select a profession</option>
                      {professionOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div className={`grid gap-3 ${isCustomGender ? "grid-cols-2 md:col-span-2" : ""}`}>
                  <Field label="Gender">
                    <select
                      value={gender}
                      onChange={(e) => {
                        const nextGender = e.target.value;
                        setGender(nextGender);
                        if (nextGender !== "Other") setCustomGender("");
                      }}
                      className={INPUT_CLASS}
                      required
                    >
                      <option value="">Select a gender</option>
                      {genderOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {isCustomGender ? (
                  <Field label="Your gender">
                    <input
                      value={customGender}
                      onChange={(e) => setCustomGender(e.target.value)}
                      className={INPUT_CLASS}
                      placeholder="Enter your gender"
                      required
                    />
                  </Field>
                  ) : null}
                </div>
                <Field label="Date of birth">
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className={INPUT_CLASS}
                    required
                  />
                  {isUnder18 ? (
                    <div className="text-xs font-medium text-red-600">
                      You must be at least 18 years old to apply as a proctor.
                    </div>
                  ) : null}
                </Field>
                <Field label="Ethnicity">
                  <select value={ethnicity} onChange={(e) => setEthnicity(e.target.value)} className={INPUT_CLASS} required>
                    <option value="">Select ethnicity</option>
                    {ethnicityOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Self-introduction">
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} className={`${INPUT_CLASS} min-h-24 resize-y`} placeholder="Introduce yourself, your proctoring experience, exam environments, and strengths." required />
              </Field>
            </FormSection>
            ) : null}

            {activeStep === 1 ? (
            <FormSection title="Current address">
              <UsAddressFields
                city={city}
                cityOptions={cityOptions}
                customCity={customCity}
                inputClassName={INPUT_CLASS}
                onCityChange={setCity}
                onCustomCityChange={setCustomCity}
                onStateChange={(value) => {
                  setStateValue(value);
                  setCity("");
                  setCustomCity("");
                }}
                onStreetChange={setStreet}
                onZipCodeChange={setZipCode}
                state={stateValue}
                stateOptions={stateOptions}
                street={street}
                zipCode={zipCode}
              />
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field label="IANA timezone">
                  <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className={INPUT_CLASS} required>
                    <option value="">Select a timezone</option>
                    {timezoneOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </FormSection>
            ) : null}

            {activeStep === 2 ? (
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
                    onChange={(e) => setHourlyRate(e.target.value)}
                    className={`${INPUT_CLASS} pl-7 pr-14`}
                    aria-label={`Hourly rate in ${currency.code}`}
                    required
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-zinc-500">
                    {currency.code}
                  </span>
                </div>
              </Field>
              <Field label="Minimum hours per session">
                <input type="number" min="0.5" step="0.5" value={minimumHours} onChange={(e) => setMinimumHours(e.target.value)} className={INPUT_CLASS} required />
              </Field>
              <Field label="Maximum hours per session">
                <input type="number" min="0.5" step="0.5" value={maximumHours} onChange={(e) => setMaximumHours(e.target.value)} className={INPUT_CLASS} required />
              </Field>
              </div>
            </FormSection>
            ) : null}

            {activeStep === 3 ? (
            <FormSection title="Education">
              <EducationFields
                degreeOptions={degreeOptions}
                education={education}
                inputClassName={INPUT_CLASS}
                majorOptions={majorOptions}
                onAddEducation={() => setEducation((current) => [...current, { ...EMPTY_EDUCATION }])}
                onBooleanChange={updateEducationBoolean}
                onChange={updateEducation}
                onDiplomaUpload={(index, file) => void uploadDiploma(index, file)}
                onRemoveEducation={(index) => setEducation((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                schoolOptions={schoolOptions}
                siteName={SITE_NAME}
                uploadingEducationIndex={uploadingEducationIndex}
              />
            </FormSection>
            ) : null}

            {activeStep === 4 ? (
            <FormSection title="Identity and profile media">
              <Field label="Government-issued ID">
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    void uploadGovernmentId(e.target.files?.[0] ?? null);
                    e.target.value = "";
                  }}
                  className={INPUT_CLASS}
                  required={governmentIdUrls.length === 0}
                />
                <div className="text-xs text-zinc-500">
                  Accepted formats: PDF, JPG, JPEG, PNG. Maximum file size: 5 MB.
                </div>
                {uploadingGovernmentId ? <div className="text-xs text-zinc-500">Uploading government ID...</div> : null}
                {governmentIdUrls.length > 0 ? (
                  <div className="flex flex-wrap gap-2 text-xs">
                    {governmentIdUrls.map((url) => (
                      <a key={url} href={governmentIdHref(url)} target="_blank" rel="noreferrer" className="rounded-full border border-zinc-200 px-3 py-1 text-zinc-700 underline">
                        Government ID
                      </a>
                    ))}
                  </div>
                ) : null}
              </Field>
              <Field label="Profile images">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    void uploadProfileImage(e.target.files?.[0] ?? null);
                    e.target.value = "";
                  }}
                  className={INPUT_CLASS}
                  required={imageUrls.length === 0}
                />
                {uploadingProfileImage ? <div className="text-xs text-zinc-500">Uploading profile image...</div> : null}
                {imageUrls.length > 0 ? (
                  <div className="flex flex-wrap gap-2 text-xs">
                    {imageUrls.map((url) => (
                      <a key={url} href={profileImageHref(url)} target="_blank" rel="noreferrer" className="rounded-full border border-zinc-200 px-3 py-1 text-zinc-700 underline">
                        Image
                      </a>
                    ))}
                  </div>
                ) : null}
              </Field>
            </FormSection>
            ) : null}

            {error ? <div className="text-sm text-red-600">{error}</div> : null}
            {notice ? <div className="text-sm text-emerald-700">{notice}</div> : null}

            {!isSubmitted ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-5">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setNotice(null);
                  setActiveStep((current) => Math.max(current - 1, 0));
                }}
                disabled={activeStep === 0 || loading || draftSaving}
                className="rounded-full border border-zinc-300 px-5 py-2 text-sm font-medium text-zinc-800 hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Back
              </button>
              {isLastStep ? (
                <button type="submit" disabled={loading || isUnder18 || uploadingGovernmentId} className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-70">
                  {loading ? "Submitting..." : "Submit for admin review"}
                </button>
              ) : (
                <button type="button" onClick={continueToNextStep} disabled={loading || draftSaving || uploadingEducationIndex !== null || uploadingProfileImage || uploadingGovernmentId} className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-70">
                  {draftSaving ? "Saving..." : "Continue"}
                </button>
              )}
            </div>
            ) : null}
          </form>
        </section>
      </main>
    </div>
  );
}

/**
 * Renders the form section component.
 *
 * @param title, children - Input used by form section.
 *
 * @returns The rendered UI for this component.
 */
function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 border-t border-zinc-100 pt-6 first:border-t-0 first:pt-0">
      <h2 className="text-sm font-semibold text-zinc-950">{title}</h2>
      {children}
    </section>
  );
}

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
