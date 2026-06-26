/**
 * This is shape for one education experience within the proctor application.
 * the education in the ProctorApplicationFormValues uses EducationInput
 */
export type EducationInput = {
  degree: string;
  school: string;
  customSchool: string;
  major: string;
  customMajor: string;
  startMonth: string;
  endMonth: string;
  diplomaUrl: string;
  schoolEmail: string;
  educationVerificationAuthorized: boolean;
  schoolEmailVerificationStatus: string;
  schoolEmailVerificationSentAt?: string;
  schoolEmailVerifiedAt?: string;
};

/**
 * This is type for the full application form.
 */
export type ProctorApplicationFormValues = {
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

/**
 * State dropdown option returned by the proctor application options API.
 *
 * Example: `{ name: "California", code: "CA" }`.
 */
export type StateOption = {
  name: string;
  code: string;
};


/**
 * Configuration for uploading a selected file from the proctor application form.
 *
 * Example: a government ID upload uses endpoint
 * `/api/account/proctor-application/government-id-upload` and an allowed-type set
 * containing PDF, JPG, and PNG MIME types.
 */
export type ApplicationFileUploadOptions = {
  allowedTypes: ReadonlySet<string>;
  endpoint: string;
  fallbackError: string;
  file: File;
  onRequestStart: () => void;
  sizeError: string;
  typeError: string;
};

/**
 * City-only response returned when the options API receives a state code.
 *
 * Example: `/api/account/proctor-application/options?state=CA` returns
 * `{ cities: ["Los Angeles", "Other"] }`.
 */
export type CityOptionsResponse = {
  cities: string[];
};

/**
 * Row shape returned by the professions option query.
 *
 * Example: `{ name: "Accountant" }`.
 */
export type ProfessionOptionRow = {
  name: string;
};

/**
 * Row shape returned by the United States states option query.
 *
 * Example: `{ name: "California", code: "CA" }`.
 */
export type StateOptionRow = {
  name: string;
  code: string;
};

/**
 * Row shape returned by the city option query.
 *
 * Example: `{ name: "Los Angeles" }`.
 */
export type CityOptionRow = {
  name: string;
};

/**
 * Shared row shape for option tables that only select a `name` column.
 *
 * Example: the degree, school, major, gender, ethnicity, and timezone queries
 * each return rows like `{ name: "Bachelor's Degree" }`.
 */
export type NamedOptionRow = {
  name: string;
};
