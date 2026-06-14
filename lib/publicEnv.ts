/**
 * Reads a public environment variable that is safe to expose to browser code.
 *
 * @param name - Public environment variable name, such as `NEXT_PUBLIC_API_BASE_URL`.
 * @param value - Value read with direct `process.env.NEXT_PUBLIC_*` access so Next.js can inline it for client bundles.
 *
 * @returns The trimmed environment value.
 */
function requiredPublicEnv(name: string, value: string | undefined) {
  const trimmedValue = value?.trim();
  if (!trimmedValue) {
    throw new Error(`Missing required public environment variable: ${name}`);
  }

  return trimmedValue;
}

/**
 * Reads an optional public environment variable that is safe to expose to browser code.
 *
 * @param value - Value read with direct `process.env.NEXT_PUBLIC_*` access.
 *
 * @returns The trimmed value, or undefined when the variable is not configured.
 */
function optionalPublicEnv(value: string | undefined) {
  const trimmedValue = value?.trim();
  return trimmedValue ? trimmedValue : undefined;
}

/**
 * Reads an optional public numeric environment variable.
 *
 * @param name - Public environment variable name, such as `NEXT_PUBLIC_RMB_TO_USD`.
 * @param value - Raw string value read from `process.env`.
 *
 * @returns The parsed numeric value.
 */
function requiredPublicNumberEnv(name: string, value: string | undefined) {
  const rawValue = requiredPublicEnv(name, value);
  const numericValue = Number(rawValue);
  if (!Number.isFinite(numericValue)) {
    throw new Error(`${name} must be a valid number. Example: ${name}=0.14`);
  }

  return numericValue;
}

// Public API base URL for browser code.
// Example: `NEXT_PUBLIC_API_BASE_URL=http://localhost:4000`.
export const publicApiBaseUrl = requiredPublicEnv(
  "NEXT_PUBLIC_API_BASE_URL",
  process.env.NEXT_PUBLIC_API_BASE_URL,
);

// Public brand name displayed in browser-visible UI and metadata.
// Example: `NEXT_PUBLIC_BRAND_NAME=ProctorMe`.
export const publicBrandName =
  optionalPublicEnv(process.env.NEXT_PUBLIC_BRAND_NAME) ?? "ProctorMe";

// Optional Google Analytics measurement ID.
// Example: `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=G-PDVZ94NPQ8`.
export const publicGoogleAnalyticsId = optionalPublicEnv(
  process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID,
);

// Public RMB-to-USD conversion rate for browser-visible price calculations.
// Example: `NEXT_PUBLIC_RMB_TO_USD=0.14`.
export const publicRmbToUsd = requiredPublicNumberEnv(
  "NEXT_PUBLIC_RMB_TO_USD",
  process.env.NEXT_PUBLIC_RMB_TO_USD,
);
