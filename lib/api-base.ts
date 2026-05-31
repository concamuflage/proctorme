export const CLIENT_API_BASE_PATH = "/api";

export function getServerApiBaseUrl() {
  return process.env.NEXTAUTH_URL || process.env.CLIENT_ORIGIN || "http://localhost:3000";
}
