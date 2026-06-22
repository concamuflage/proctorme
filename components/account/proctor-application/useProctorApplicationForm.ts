"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
// Question:how to understand the FieldPath and FieldPathValue signatures in React Hook Form?
import { useFieldArray, useForm, type FieldPath, type FieldPathValue } from "react-hook-form";
import { EMPTY_EDUCATION, type EducationInput } from "@/components/account/EducationFields";
import { ALLOWED_DOCUMENT_FILE_TYPES, ALLOWED_PROFILE_IMAGE_FILE_TYPES, MAX_UPLOAD_FILE_BYTES } from "@/lib/uploadFileSpecs";

type StateOption = {
  name: string;
  code: string;
};

type ApplicationFileUploadOptions = {
  /** Allowed MIME types for this upload. Example: `ALLOWED_DOCUMENT_FILE_TYPES` accepts PDF, JPG, and PNG. */
  allowedTypes: ReadonlySet<string>;
  /** API route that accepts multipart form data. Example: `/api/account/proctor-application/government-id-upload`. */
  endpoint: string;
  /** Fallback error when the API does not return a URL. Example: `Unable to upload government ID.` */
  fallbackError: string;
  /** Selected browser file. Example: `passport.pdf` with type `application/pdf`. */
  file: File;
  /** Callback that marks the upload as in flight after validation passes and before the request starts. */
  onRequestStart: () => void;
  /** Error used when the selected file is too large or empty. Example: `Government ID file must be 5 MB or smaller.` */
  sizeError: string;
  /** Error used when the selected file MIME type is not allowed. Example: `Profile image must be a JPG, PNG, or WebP file.` */
  typeError: string;
};

type ProctorApplicationFormValues = {
  profession: string;
  gender: string;
  ethnicity: string;
  dateOfBirth: string;
  bio: string;
  street: string;
  city: string;
  customCity: string;
  stateValue: string;
  zipCode: string;
  timezone: string;
  hourlyRate: string;
  minimumHours: string;
  maximumHours: string;
  imageUrls: string[];
  governmentIdUrls: string[];
  education: EducationInput[];
};

export const FORM_STEPS = [
  "Profile basics",
  "Current address",
  "Rates and session length",
  "Education",
  "Identity and profile media",
] as const;

export const INPUT_CLASS = "w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900";

const COUNTRY_CURRENCY = {
  "United States": {
    code: "USD",
    symbol: "$",
  },
} as const;

const DEFAULT_FORM_VALUES: ProctorApplicationFormValues = {
  profession: "",
  gender: "",
  ethnicity: "",
  dateOfBirth: "",
  bio: "",
  street: "",
  city: "",
  customCity: "",
  stateValue: "",
  zipCode: "",
  timezone: "",
  hourlyRate: "",
  minimumHours: "1",
  maximumHours: "2",
  imageUrls: [],
  governmentIdUrls: [],
  education: [{ ...EMPTY_EDUCATION }],
};

/**
 * Checks whether the date of birth is at least the requested age.
 *
 * @param dateOfBirth - ISO date string, for example `2000-06-20`.
 * @param age - Required age in years, for example `18`.
 * @returns True when the birth date is at least that old on the current UTC date.
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
 * Validates and uploads one proctor application file through a multipart API route.
 *
 * @param options - Upload configuration, for example a government ID file sent to `/api/account/proctor-application/government-id-upload`.
 * @returns The private uploaded file URL, for example `gcs://bucket/proctor-applications/206/government-ids/passport.pdf`.
 */
async function uploadApplicationFile({
  allowedTypes,
  endpoint,
  fallbackError,
  file,
  onRequestStart,
  sizeError,
  typeError,
}: ApplicationFileUploadOptions) {
  if (!allowedTypes.has(file.type)) {
    throw new Error(typeError);
  }
  if (file.size <= 0 || file.size > MAX_UPLOAD_FILE_BYTES) {
    throw new Error(sizeError);
  }

  onRequestStart();

  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
  });
  const payload = await response.json().catch(() => null);
  // This branch only handles completed HTTP responses whose status or payload does not represent a successful upload.
  // Example: a 400 response with `{ error: "File too large." }` becomes `Error("File too large.")`.
  if (!response.ok || typeof payload?.url !== "string") {
    throw new Error(payload?.error ?? fallbackError);
  }

  return payload.url;
}

/**
 * Owns the proctor application wizard state, effects, validation, and API calls.
 *
 * @returns Form state and callbacks consumed by `ProctorApplicationClient`, for example `activeStep`, `continueToNextStep`, and `uploadGovernmentId`.
 */
export function useProctorApplicationForm() {
  const router = useRouter();
  const { status } = useSession();

  const form = useForm<ProctorApplicationFormValues>({
    defaultValues: DEFAULT_FORM_VALUES,
  });

  const { append: appendEducation, remove: removeEducationField } = useFieldArray<ProctorApplicationFormValues, "education">({
    // control: form.control passes React Hook Form’s internal form controller into useFieldArray.
    // Without control, useFieldArray would not know which form it belongs to.
    // control: form.control = which form this field array belongs to
    // name: "education" = which field inside that form is the array
    control: form.control,
    name: "education",
  });

  const formValues = form.watch();

  // Profession select choices from /api/account/proctor-application/options. setProfessionOptions runs after options load; example values include ["Accountant", "Teacher"].
  const [professionOptions, setProfessionOptions] = useState<string[]>([]);
  // Gender select choices from /api/account/proctor-application/options. setGenderOptions runs after options load and ProfileBasicsStep renders the choices.
  const [genderOptions, setGenderOptions] = useState<string[]>([]);
  // Ethnicity select choices from /api/account/proctor-application/options. setEthnicityOptions runs after options load and drives the Step 1 ethnicity dropdown.
  const [ethnicityOptions, setEthnicityOptions] = useState<string[]>([]);
  // United States state choices for Step 2. setStateOptions runs after options load and is passed into CurrentAddressStep.
  const [stateOptions, setStateOptions] = useState<StateOption[]>([]);
  // City choices for the selected state in Step 2. setCityOptions clears when state is missing and reloads when stateValue changes.
  const [cityOptions, setCityOptions] = useState<string[]>([]);
  // Timezone choices for Step 2. setTimezoneOptions runs after options load and CurrentAddressStep renders the dropdown.
  const [timezoneOptions, setTimezoneOptions] = useState<string[]>([]);
  // Degree choices for Step 4 education rows. setDegreeOptions runs after options load and is passed into EducationStep.
  const [degreeOptions, setDegreeOptions] = useState<string[]>([]);
  // School choices for Step 4 education rows. setSchoolOptions runs after options load and is passed into EducationStep.
  const [schoolOptions, setSchoolOptions] = useState<string[]>([]);
  // Major choices for Step 4 education rows. setMajorOptions runs after options load and is passed into EducationStep.
  const [majorOptions, setMajorOptions] = useState<string[]>([]);
  // Current persisted application status. setApplicationStatus hydrates saved status and changes to "pending" after final submit succeeds.
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);
  // Positive user feedback shown through AlertMessage. setNotice clears before new actions, then shows successful verification-send or final-submit messages.
  const [notice, setNotice] = useState<string | null>(null);
  // Validation or request failure shown through AlertMessage. setError clears before actions and is set by validation, uploads, draft saves, verification sends, and final submit failures.
  const [error, setError] = useState<string | null>(null);
  // Final submit in-flight flag. setLoading turns true during handleSubmit() and false after the submit response or age-validation failure.
  const [loading, setLoading] = useState(false);
  // Draft save in-flight flag. setDraftSaving turns true while saveApplicationDraft() PATCHes the current step and false in its finally block.
  const [draftSaving, setDraftSaving] = useState(false);
  // Education row index currently sending a school verification email. setSendingSchoolEmailIndex stores the row index during sendSchoolEmailVerification() and resets to null afterward.
  const [sendingSchoolEmailIndex, setSendingSchoolEmailIndex] = useState<number | null>(null);
  // Education row index currently uploading a diploma. setUploadingEducationIndex stores the row index during uploadDiploma() and resets after the upload response.
  const [uploadingEducationIndex, setUploadingEducationIndex] = useState<number | null>(null);
  // Profile image upload in-flight flag. setUploadingProfileImage wraps uploadProfileImage() so the Step 5 upload control can show progress.
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false);
  // Government ID upload in-flight flag. setUploadingGovernmentId wraps uploadGovernmentId() so submit and upload controls can disable during the upload.
  const [uploadingGovernmentId, setUploadingGovernmentId] = useState(false);
  // Current wizard step index. setActiveStep advances after a successful draft save and moves back from the Back button.
  const [activeStep, setActiveStep] = useState(0);

  const currency = COUNTRY_CURRENCY["United States"];
  const currentStepTitle = FORM_STEPS[activeStep];
  const isLastStep = activeStep === FORM_STEPS.length - 1;
  // `applicationStatus === "pending"` means the submit API returned an application waiting for admin review.
  // `Boolean(notice)` makes this true only after handleSubmit() sets the success message in this browser session.
  // Example: after POST /api/account/proctor-application succeeds, status is "pending" and notice is
  // "Application submitted...", so the Back/Continue/Submit button area is hidden.
  const isSubmitted = applicationStatus === "pending" && Boolean(notice);


  const {
    bio,
    city,
    customCity,
    dateOfBirth,
    education,
    ethnicity,
    gender,
    governmentIdUrls,
    hourlyRate,
    imageUrls,
    maximumHours,
    minimumHours,
    profession,
    stateValue,
    street,
    timezone,
    zipCode,
  } = formValues;

  /**
   * This function is a typed helper around React Hook Form’s form.setValue. It just clears error and notice messages before setting the new value.
   * Field is a generic type parameter.
   * FieldPath<ProctorApplicationFormValues> constrains the Field type to a valid path/property in the ProctorApplicationFormValues type.
   * FieldPathValue <ProctorApplicationFormValues, Field> is a type that represents the value type of a field/property in the ProctorApplicationFormValues type.
   * @param field - Form field name, for example `profession` or `zipCode`.
   * @param value - New field value, for example `"Teacher"` or `"94103"`.
   * @returns Nothing; React Hook Form stores the new value and triggers subscribers.
   */
  function setFormValue<Field extends FieldPath<ProctorApplicationFormValues>>(field: Field, value: FieldPathValue<ProctorApplicationFormValues, Field>) {
    setError(null);
    setNotice(null);
    form.setValue(field, value, { shouldDirty: true });
  }

  /**
   * Updates the React Hook Form education array from its latest stored value.
   *
   * @param updater - Function that receives current rows and returns the next rows, for example replacing row `0` after a diploma upload.
   * @returns Nothing; `education` watchers receive the updated array.
   */
  function setEducationRows(updater: (current: EducationInput[]) => EducationInput[]) {
    form.setValue("education", updater(form.getValues("education") ?? []), { shouldDirty: true });
  }

  useEffect(() => {
    if (status === "loading") return;
    if (status !== "authenticated") {
      router.replace(`/login?callbackUrl=${encodeURIComponent("/account/proctor-verification")}`);
      return;
    }

    let cancelled = false;

    /**
     * Loads the saved application draft and option lists needed by the wizard.
     *
     * @returns Nothing; state setters hydrate the current browser form from API responses.
     */
    async function loadApplication() {
      // The saved application draft and selectable option lists are independent, so load both at the same time.
      const [applicationResponse, optionsResponse] = await Promise.all([
        fetch("/api/account/proctor-application", { cache: "no-store" }),
        fetch("/api/account/proctor-application/options", { cache: "no-store" }),
      ]);

      // Parse both responses after both requests finish; each payload hydrates a different part of the form.
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
      const accountDateOfBirth = typeof payload?.dateOfBirth === "string" ? payload.dateOfBirth : "";
      // If the application request failed or the user has not started a proctor application yet, use a clean form.
      // Keep the account-level date of birth because it may already exist on the user profile.
      // Example: `{ application: null, dateOfBirth: "1999-04-12" }` resets every field except `dateOfBirth`.
      if (!applicationResponse.ok || !payload?.application) {
        form.reset({ ...DEFAULT_FORM_VALUES, dateOfBirth: accountDateOfBirth });
        return;
      }
      const app = payload.application;
      setApplicationStatus(app.status === "draft" ? null : app.status ?? null);
      const savedProfession = typeof app.profession === "string" ? app.profession : "";
      const professionChoices = Array.isArray(optionsPayload?.professions) ? optionsPayload.professions : [];
      const savedGender = typeof app.gender === "string" ? app.gender : "";
      const genderChoices = Array.isArray(optionsPayload?.genders) ? optionsPayload.genders : [];
      // Custom gender entry is disabled, so saved custom values cannot be edited through this select.
      // Example: saved `gender: "Prefer to self-describe"` renders as blank unless that exact option exists.
      const hydratedEducation = Array.isArray(app.education) && app.education.length > 0
        ? app.education.map((item: Partial<EducationInput> & { diplomaUrls?: string[] }) => ({
            ...EMPTY_EDUCATION,
            ...item,
            // Read old saved drafts with `diplomaUrls`, but keep current form state as one `diplomaUrl`.
            diplomaUrl: item.diplomaUrl || (Array.isArray(item.diplomaUrls) ? item.diplomaUrls.find((url): url is string => typeof url === "string") ?? "" : ""),
            degree: item.degree && Array.isArray(optionsPayload?.degrees) && optionsPayload.degrees.includes(item.degree) ? item.degree : "",
            school: item.school && Array.isArray(optionsPayload?.schools) && !optionsPayload.schools.includes(item.school) ? "Other" : item.school ?? "",
            customSchool: item.school && Array.isArray(optionsPayload?.schools) && !optionsPayload.schools.includes(item.school) ? item.school : "",
            major: item.major && Array.isArray(optionsPayload?.majors) && !optionsPayload.majors.includes(item.major) ? "Other" : item.major ?? "",
            customMajor: item.major && Array.isArray(optionsPayload?.majors) && !optionsPayload.majors.includes(item.major) ? item.major : "",
          }))
        : [{ ...EMPTY_EDUCATION }];
      // Hydrate React Hook Form in one reset so watched values and the education field array update together.
      // Example: a saved draft with `profession: "Accountant"` and one education row becomes the new form defaults.
      form.reset({
        ...DEFAULT_FORM_VALUES,
        profession: savedProfession && professionChoices.includes(savedProfession) ? savedProfession : "",
        gender: savedGender && (genderChoices.length === 0 || genderChoices.includes(savedGender)) ? savedGender : "",
        ethnicity: typeof app.ethnicity === "string" ? app.ethnicity : "",
        dateOfBirth: typeof app.dateOfBirth === "string" ? app.dateOfBirth : accountDateOfBirth,
        bio: app.bio ?? "",
        street: app.street ?? "",
        city: app.city ?? "",
        stateValue: app.state ?? "",
        zipCode: app.zipCode ?? "",
        timezone: app.timezone ?? "",
        hourlyRate: app.hourlyRate == null ? "" : String(app.hourlyRate),
        minimumHours: app.minimumHours == null ? "1" : String(app.minimumHours),
        maximumHours: app.maximumHours == null ? "2" : String(app.maximumHours),
        imageUrls: Array.isArray(app.imageUrls) ? app.imageUrls : [],
        governmentIdUrls: Array.isArray(app.governmentIdUrls) ? app.governmentIdUrls : [],
        education: hydratedEducation,
      });
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
     * Loads city options for the selected state.
     *
     * @returns Nothing; `setCityOptions` hydrates values such as `["San Francisco", "San Jose", "Other"]`.
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
      setFormValue("customCity", city);
      setFormValue("city", "Other");
    }
  }, [city, cityOptions]);

  useEffect(() => {
    if (activeStep !== 3) return;
    const pendingIndexes = education
      .map((item, index) => item.schoolEmail.trim() && item.schoolEmailVerificationStatus === "pending" ? index : -1)
      .filter((index) => index >= 0);
    if (pendingIndexes.length === 0) return;

    /**
     * Refreshes pending school email rows when the user returns after opening a verification link.
     *
     * @returns Nothing.
     */
    function refreshPendingSchoolEmails() {
      pendingIndexes.forEach((index) => {
        void refreshSchoolEmailVerificationStatus(index);
      });
    }

    window.addEventListener("focus", refreshPendingSchoolEmails);
    const intervalId = window.setInterval(refreshPendingSchoolEmails, 5000);

    return () => {
      window.removeEventListener("focus", refreshPendingSchoolEmails);
      window.clearInterval(intervalId);
    };
  }, [activeStep, education]);

  /**
   * Updates one education field and clears school email verification when the address changes.
   *
   * @param index - Education row index, for example `0`.
   * @param field - Education field name, for example `schoolEmail` or `educationVerificationAuthorized`.
   * @param value - New field value, for example `student@school.edu` or `true`.
   * @returns Nothing.
   */
  const updateEducation = <Field extends keyof EducationInput>(index: number, field: Field, value: EducationInput[Field]) => {
    setError(null);
    setNotice(null);
    setEducationRows((current) => current.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      if (field !== "schoolEmail") return { ...item, [field]: value };
      
      //  if the field is "  ", school email is not empty
      // later in if (item.schoolEmail) {
      // require verification
      // }, item.schoolEmail will be truthy and still requires verification.
      // the following value.trim().toLowerCase() make sure "  " is replaced with an empty string ""
      // so no email verification is required.

      const schoolEmail = typeof value === "string" ? value.trim().toLowerCase() : "";

      // Verification belongs to a specific email address, so changing the address invalidates the old status.
      // Example: changing `old@bu.edu` to `new@bu.edu` resets status from `verified` to `not_provided`.
      return {
        ...item,
        schoolEmail,
        schoolEmailVerificationStatus: "not_provided",
        schoolEmailVerificationSentAt: "",
        schoolEmailVerifiedAt: "",
      };
    }));
  };

  /**
   * Updates the selected state and clears city values that belong to the previous state.
   *
   * @param value - New state code, for example `CA`.
   * @returns Nothing; the state change triggers the city-option reload effect.
   */
  function updateAddressState(value: string) {
    setError(null);
    setNotice(null);
    form.setValue("stateValue", value, { shouldDirty: true });
    form.setValue("city", "", { shouldDirty: true });
    form.setValue("customCity", "", { shouldDirty: true });
  }

  /**
   * Adds one blank education row to the parent-owned education array.
   *
   * @returns Nothing; React rerenders with a new row shaped like `EMPTY_EDUCATION`.
   */
  function addEducation() {
    appendEducation({ ...EMPTY_EDUCATION });
  }

  /**
   * Removes one education row by index.
   *
   * @param index - Education row index to remove, for example `1`.
   * @returns Nothing; React rerenders with that row filtered out.
   */
  function removeEducation(index: number) {
    removeEducationField(index);
  }

  /**
   * Moves the wizard to the previous step and clears cross-step messages.
   *
   * @returns Nothing; the active step changes from values like `2` to `1`.
   */
  function goToPreviousStep() {
    setError(null);
    setNotice(null);
    setActiveStep((current) => Math.max(current - 1, 0));
  }

  /**
   * Uploads one education row diploma and stores the returned private GCS URI on that row.
   *
   * @param index - Education row index, for example `0`.
   * @param file - Selected diploma file, for example `diploma.pdf`.
   * @returns Nothing. On success, sets `education[index].diplomaUrl` to a URL such as `gcs://bucket/proctor-applications/206/diplomas/diploma.pdf`.
   */
  const uploadDiploma = async (index: number, file: File | null) => {
    if (!file) return;
    setError(null);
    let requestStarted = false;
    try {
      const url = await uploadApplicationFile({
        allowedTypes: ALLOWED_DOCUMENT_FILE_TYPES,
        endpoint: "/api/account/proctor-application/diploma-upload",
        fallbackError: "Unable to upload diploma.",
        file,
        onRequestStart: () => {
          requestStarted = true;
          setUploadingEducationIndex(index);
        },
        sizeError: "Diploma file must be 5 MB or smaller.",
        typeError: "Diploma must be a PDF, JPG, JPEG, or PNG file.",
      });
      setEducationRows((current) => current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, diplomaUrl: url } : item
      ));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload diploma.");
    } finally {
      if (requestStarted) setUploadingEducationIndex(null);
    }
  };

  /**
   * Uploads a Step 5 profile image after checking the shared image type list and 5 MB upload limit.
   *
   * @param file - Selected image file, for example `headshot.png`.
   * @returns Nothing. On success, appends a URL such as `gcs://bucket/proctor-applications/206/profile-images/headshot.png` to `imageUrls`.
   */
  const uploadProfileImage = async (file: File | null) => {
    if (!file) return;
    setError(null);
    let requestStarted = false;
    try {
      const url = await uploadApplicationFile({
        allowedTypes: ALLOWED_PROFILE_IMAGE_FILE_TYPES,
        endpoint: "/api/account/proctor-application/profile-image-upload",
        fallbackError: "Unable to upload profile image.",
        file,
        onRequestStart: () => {
          requestStarted = true;
          setUploadingProfileImage(true);
        },
        sizeError: "Profile image must be 5 MB or smaller.",
        typeError: "Profile image must be a JPG, PNG, or WebP file.",
      });
      form.setValue("imageUrls", [...form.getValues("imageUrls"), url], { shouldDirty: true });
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload profile image.");
    } finally {
      if (requestStarted) setUploadingProfileImage(false);
    }
  };

  /**
   * Uploads the government ID file and stores the returned private GCS URI in the governmentIdUrls state.
   *
   * @param file - Selected file, for example a `passport.pdf` with MIME type `application/pdf`.
   * @returns Nothing. On success, appends a URL such as `gcs://bucket/proctor-applications/206/government-ids/passport.pdf` to `governmentIdUrls`.
   */
  const uploadGovernmentId = async (file: File | null) => {
    if (!file) return;
    setError(null);
    let requestStarted = false;
    try {
      const url = await uploadApplicationFile({
        allowedTypes: ALLOWED_DOCUMENT_FILE_TYPES,
        endpoint: "/api/account/proctor-application/government-id-upload",
        fallbackError: "Unable to upload government ID.",
        file,
        onRequestStart: () => {
          requestStarted = true;
          setUploadingGovernmentId(true);
        },
        sizeError: "Government ID file must be 5 MB or smaller.",
        typeError: "Government ID must be a PDF, JPG, JPEG, or PNG file.",
      });
      form.setValue("governmentIdUrls", [...form.getValues("governmentIdUrls"), url], { shouldDirty: true });
    } catch (uploadError) {
      // Error state change is reflected in the UI, but the URL array is unchanged so no new file chip appears.
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload government ID.");
    } finally {
      if (requestStarted) setUploadingGovernmentId(false);
    }
  };

  /**
   * Validates the active proctor application step before continuing or submitting.
   *
   * @returns An error string, for example `Send and verify each provided school email before continuing.`, or null when valid.
   */
  const validateActiveStep = () => {
    const resolvedCity = city === "Other" ? customCity.trim() : city;
    const minHours = Number(minimumHours);
    const maxHours = Number(maximumHours);

    if (activeStep === 0) {
      if (!profession) return "Profession is required.";
      if (!gender) return "Gender is required.";
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
        if (!item.diplomaUrl) return "A diploma upload is required for each education entry.";
        if (!item.educationVerificationAuthorized) return "Check the education verification authorization box for each education entry before continuing.";
        if (item.schoolEmail.trim() && item.schoolEmailVerificationStatus !== "verified") return "Send and verify each provided school email before continuing.";
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
   * Builds the proctor application API payload from the current form state.
   *
   * @returns The API payload, for example `education: [{ degree: "Bachelor's Degree", school: "Boston University", major: "Computer Science", diplomaUrl: "gcs://bucket/path/diploma.pdf" }]`.
   */
  const buildApplicationPayload = () => {
    const resolvedCity = city === "Other" ? customCity.trim() : city;
    const resolvedEducation = education.map((item) => ({
      degree: item.degree,
      school: item.school === "Other" ? item.customSchool.trim() : item.school,
      major: item.major === "Other" ? item.customMajor.trim() : item.major,
      startMonth: item.startMonth,
      endMonth: item.endMonth,
      diplomaUrl: item.diplomaUrl,
      schoolEmail: item.schoolEmail.trim(),
      educationVerificationAuthorized: item.educationVerificationAuthorized,
      schoolEmailVerificationStatus: item.schoolEmailVerificationStatus,
      schoolEmailVerificationSentAt: item.schoolEmailVerificationSentAt,
      schoolEmailVerifiedAt: item.schoolEmailVerifiedAt,
    }));

    return {
      profession,
      gender,
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
   * Saves the current application values as a draft.
   *
   * @returns The draft save API payload, for example `{ application: { status: "draft" } }`.
   */
  async function saveApplicationDraft() {
    setDraftSaving(true);
    try {
      const response = await fetch("/api/account/proctor-application", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildApplicationPayload()),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to save this section.");
      }
      return payload;
    } finally {
      setDraftSaving(false);
    }
  }

  /**
   * Refreshes one school email verification status from the server.
   *
   * @param index - Education row index, for example `0`.
   * @returns Nothing.
   */
  async function refreshSchoolEmailVerificationStatus(index: number) {
    const item = education[index];
    if (!item?.schoolEmail.trim()) return;

    const params = new URLSearchParams({
      educationIndex: String(index),
      schoolEmail: item.schoolEmail.trim(),
    });
    const response = await fetch(`/api/account/proctor-application/send-school-email-verification?${params.toString()}`, {
      cache: "no-store",
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || typeof payload?.status !== "string") return;

    setEducationRows((current) => current.map((currentItem, itemIndex) =>
      itemIndex === index
        ? {
          ...currentItem,
          schoolEmailVerificationStatus: payload.status,
          schoolEmailVerificationSentAt: typeof payload.sentAt === "string" ? payload.sentAt : currentItem.schoolEmailVerificationSentAt,
          schoolEmailVerifiedAt: typeof payload.verifiedAt === "string" ? payload.verifiedAt : currentItem.schoolEmailVerifiedAt,
        }
        : currentItem
    ));
  }

  /**
   * Saves the current draft and sends a school email verification link.
   *
   * @param index - Education row index, for example `0`.
   * @returns Nothing.
   */
  async function sendSchoolEmailVerification(index: number) {
    const item = education[index];
    if (!item?.schoolEmail.trim()) {
      setError("Enter a school email address before sending verification.");
      return;
    }
    const school = item.school === "Other" ? item.customSchool.trim() : item.school;
    const major = item.major === "Other" ? item.customMajor.trim() : item.major;
    if (!item.degree || !school || !major) {
      setError("Complete the degree, school, and major before sending school email verification.");
      return;
    }

    setError(null);
    setNotice(null);
    setSendingSchoolEmailIndex(index);
    try {
      await saveApplicationDraft();
      const response = await fetch("/api/account/proctor-application/send-school-email-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          educationIndex: index,
          schoolEmail: item.schoolEmail.trim(),
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || typeof payload?.status !== "string") {
        throw new Error(payload?.error ?? "Unable to send school email verification.");
      }
      setEducationRows((current) => current.map((currentItem, itemIndex) =>
        itemIndex === index
          ? {
            ...currentItem,
            schoolEmailVerificationStatus: payload.status,
            schoolEmailVerificationSentAt: typeof payload.sentAt === "string" ? payload.sentAt : currentItem.schoolEmailVerificationSentAt,
            schoolEmailVerifiedAt: typeof payload.verifiedAt === "string" ? payload.verifiedAt : currentItem.schoolEmailVerifiedAt,
          }
          : currentItem
      ));
      setNotice("School email verification sent. Open the link in that email, then check the status here.");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Unable to send school email verification.");
    } finally {
      setSendingSchoolEmailIndex(null);
    }
  }



  /**
   * Saves the active step and advances to the next step after validation passes.
   *
   * @returns Nothing; on success `activeStep` moves from values like `1` to `2`.
   */
  const continueToNextStep = async () => {
    setError(null);
    setNotice(null);
    const validationError = validateActiveStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    try {
      await saveApplicationDraft();
    } catch (draftError) {
      setError(draftError instanceof Error ? draftError.message : "Unable to save this section.");
      return;
    }

    setActiveStep((current) => Math.min(current + 1, FORM_STEPS.length - 1));
  };

  /**
   * Submits the final proctor application payload through React Hook Form's submit handler.
   *
   * @returns Nothing; on success the application status and notice states are updated.
   */
  const handleSubmit = form.handleSubmit(async () => {
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
  });

  return {
    activeStep,
    addEducation,
    applicationStatus,
    bio,
    city,
    cityOptions,
    continueToNextStep,
    currency,
    currentStepTitle,
    customCity,
    dateOfBirth,
    degreeOptions,
    draftSaving,
    education,
    error,
    ethnicity,
    ethnicityOptions,
    gender,
    genderOptions,
    goToPreviousStep,
    governmentIdUrls,
    handleSubmit,
    hourlyRate,
    imageUrls,
    isLastStep,
    isSubmitted,
    loading,
    majorOptions,
    maximumHours,
    minimumHours,
    notice,
    profession,
    professionOptions,
    removeEducation,
    schoolOptions,
    sendSchoolEmailVerification,
    sendingSchoolEmailIndex,
    setFormValue,
    stateOptions,
    stateValue,
    street,
    timezone,
    timezoneOptions,
    updateAddressState,
    updateEducation,
    uploadDiploma,
    uploadGovernmentId,
    uploadingEducationIndex,
    uploadingGovernmentId,
    uploadingProfileImage,
    uploadProfileImage,
    zipCode,
  };
}
