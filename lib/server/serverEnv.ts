import "server-only";
import "@/lib/server/config/env.js";

/**
 * Reads a required server-only environment variable.
 *
 * @param name - Environment variable name to read. Example: `STRIPE_SECRET_KEY`.
 * @returns The trimmed environment value. Example: `sk_test_...`.
 */
export function requiredServerEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

/**
 * Reads an optional server-only environment variable.
 *
 * @param name - Environment variable name to read. Example: `GCS_UPLOAD_BUCKET`.
 * @returns The trimmed value when configured, or undefined when missing.
 */
export function optionalServerEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

/**
 * Reads a positive numeric server-only environment variable.
 *
 * @param name - Environment variable name to read. Example: `PGPORT`.
 * @param fallback - Number to use when the variable is missing or invalid. Example: `5432`.
 * @returns The configured positive number, or the fallback.
 */
export function positiveNumberServerEnv(name: string, fallback: number) {
  const value = Number(optionalServerEnv(name) ?? fallback);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/**
 * Checks whether the app is running in production mode.
 *
 * @returns True when `NODE_ENV=production`; otherwise false.
 */
export function serverEnvIsProduction() {
  return process.env.NODE_ENV === "production";
}

/**
 * Reads the Stripe secret key used by server-side Stripe SDK calls.
 *
 * @returns The configured Stripe secret key. Example: `sk_test_...`.
 */
export function stripeSecretKey() {
  return requiredServerEnv("STRIPE_SECRET_KEY");
}

/**
 * Reads the Stripe webhook signing secret used to verify webhook requests.
 *
 * @returns The configured Stripe webhook secret. Example: `whsec_...`.
 */
export function stripeWebhookSecret() {
  return requiredServerEnv("STRIPE_WEBHOOK_SECRET");
}

/**
 * Reads the Postgres connection settings for the shared app database pool.
 *
 * @returns Host, port, database, user, and password for `pg.Pool`.
 */
export function postgresPoolConfig() {
  return {
    host: requiredServerEnv("PGHOST"),
    port: positiveNumberServerEnv("PGPORT", 5432),
    database: requiredServerEnv("PGDATABASE"),
    user: requiredServerEnv("PGUSER"),
    password: requiredServerEnv("PGPASSWORD"),
  };
}

/**
 * Reads Resend configuration used by server-side email senders.
 *
 * @returns Resend API key and from-address. Example from-address: `no-reply@example.com`.
 */
export function resendConfig() {
  return {
    apiKey: requiredServerEnv("RESEND_API_KEY"),
    from: requiredServerEnv("RESEND_FROM_EMAIL"),
  };
}

/**
 * Normalizes an app base URL by trimming whitespace and removing trailing slashes.
 *
 * @param value - Raw URL value. Example: `http://localhost:3000/`.
 * @returns Normalized URL. Example: `http://localhost:3000`.
 */
export function normalizeServerAppBaseUrl(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim().replace(/\/+$/, "") : "";
}

/**
 * Reads and normalizes a required app base URL environment variable.
 *
 * @param envName - Environment variable containing the public app base URL. Example: `APP_BASE_URL`.
 * @returns A normalized base URL. Example: `https://outlierfit.shop`.
 */
export function appBaseUrlFromServerEnv(envName: string) {
  return normalizeServerAppBaseUrl(requiredServerEnv(envName));
}

/**
 * Chooses the server-side base URL used for internal app API calls.
 *
 * @returns Base URL from `NEXTAUTH_URL`, `CLIENT_ORIGIN`, or localhost. Example: `http://localhost:3000`.
 */
export function serverApiBaseUrl() {
  return optionalServerEnv("NEXTAUTH_URL") || optionalServerEnv("CLIENT_ORIGIN") || "http://localhost:3000";
}

/**
 * Reads the active Google Cloud project id when configured.
 *
 * @returns Project id, or undefined. Example: `project-123`.
 */
export function googleCloudProjectId() {
  return optionalServerEnv("GOOGLE_CLOUD_PROJECT_ID");
}

/**
 * Reads the upload bucket name selected for the current environment.
 *
 * @returns Configured GCS bucket name. Example: `proctorme-dev-user-uploads-project-123`.
 */
export function gcsUploadBucketName() {
  const bucketName = serverEnvIsProduction()
    ? requiredServerEnv("GCS_UPLOAD_BUCKET_PROD")
    : requiredServerEnv("GCS_UPLOAD_BUCKET_DEV");

  if (!bucketName) {
    throw new Error("Missing GCS upload bucket configuration.");
  }

  return bucketName;
}

/**
 * Reads every configured GCS upload bucket name.
 *
 * @returns Set of allowed bucket names used to validate private object URLs.
 */
export function allowedGcsUploadBuckets() {
  return new Set(
    [
      optionalServerEnv("GCS_UPLOAD_BUCKET_DEV"),
      optionalServerEnv("GCS_UPLOAD_BUCKET_PROD"),
    ]
  );
}

/**
 * Reads the Google Maps API key used by server-side geocoding/timezone calls.
 *
 * @returns Configured API key, or an empty string when neither env name is set.
 */
export function googleMapsApiKey() {
  return optionalServerEnv("GOOGLE_MAPS_API_KEY") || optionalServerEnv("GOOGLE_API_KEY") || "";
}
