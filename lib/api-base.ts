export const CLIENT_API_BASE_PATH = "/api";

/**
 * Gets server api base url for this flow.
 *
 * @returns The result used by the surrounding flow.
 */
export function getServerApiBaseUrl() {
  return process.env.NEXTAUTH_URL || process.env.CLIENT_ORIGIN || "http://localhost:3000";
}
