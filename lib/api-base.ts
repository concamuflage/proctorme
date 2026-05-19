export const CLIENT_API_BASE_PATH = "/backend";

export function getServerApiBaseUrl() {
  return process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:4000";
}
