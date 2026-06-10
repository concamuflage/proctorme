const MIN_PASSWORD_LENGTH = 12;
const PASSWORD_REQUIREMENTS_MESSAGE =
  "Password must be at least 12 characters and include uppercase, lowercase, a number, and no spaces.";

/**
 * Checks whether strong password is true for this flow.
 *
 * @param password - Input used by is strong password.
 *
 * @returns True when the value satisfies the check.
 */
function isStrongPassword(password) {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) return false;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasWhitespace = /\s/.test(password);
  return hasLower && hasUpper && hasDigit && !hasWhitespace;
}

module.exports = {
  MIN_PASSWORD_LENGTH,
  PASSWORD_REQUIREMENTS_MESSAGE,
  isStrongPassword,
};
