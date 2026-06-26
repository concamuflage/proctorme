export const EDUCATION_EMAIL_PATTERN = "^[^\\s@]+@[^\\s@]+\\.edu$";

/**
 * Checks whether an optional school email value is either blank or an education email address.
 *
 * @param email - Email entered by the user, for example `student@ucla.edu`.
 * @returns True when the value is empty or ends with `.edu`, for example `student@ucla.edu`.
 */
export function isOptionalEducationEmailAddress(email: string) {
  const trimmedEmail = email.trim().toLowerCase();
  // School email is optional; an empty value is valid and skips verification.
  // Example: `""` is valid, while `student@gmail.com` is not valid for this field.
  if (!trimmedEmail) return true;
  return new RegExp(EDUCATION_EMAIL_PATTERN).test(trimmedEmail);
}

/**
 * Checks whether a provided school email is an education email address.
 *
 * @param email - Email entered by the user, for example `student@stanford.edu`.
 * @returns True only when the non-empty value ends with `.edu`.
 */
export function isEducationEmailAddress(email: string) {
  return Boolean(email.trim()) && isOptionalEducationEmailAddress(email);
}
