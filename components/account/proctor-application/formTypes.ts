/**
 * This is shape for one education experience within the proctor application.
 * the education in the ProctorApplicationFormValues uses EducationInput[]
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
