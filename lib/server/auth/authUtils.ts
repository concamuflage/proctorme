/**
 * Converts unknown input into a trimmed string, or an empty string when invalid.
 *
 * @param value - Runtime value to normalize.
 * @returns The trimmed string value, or an empty string for non-string input.
 */
export function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Normalizes an email for consistent lookup and storage.
 *
 * @param value - Runtime email value to normalize.
 * @returns The trimmed, lowercase email string.
 */
export function normalizeEmail(value: unknown) {
  return text(value).toLowerCase();
}

/**
 * Normalizes a first or last name from request payloads.
 *
 * @param value - Runtime name value to normalize.
 * @returns The trimmed name string.
 */
export function normalizeName(value: unknown) {
  return text(value);
}
