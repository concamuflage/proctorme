import { Storage } from "@google-cloud/storage";
import {
  allowedGcsUploadBuckets,
  gcsUploadBucketName,
  googleCloudProjectId,
} from "@/lib/server/serverEnv";

const storage = new Storage({
  projectId: googleCloudProjectId(),
});

/**
 * Gets upload bucket name for this flow.
 *
 * @returns The result used by the surrounding flow.
 */
export function getUploadBucketName() {
  return gcsUploadBucketName();
}

/**
 * Runs the allowed upload buckets logic for this module.
 *
 * @returns The result used by the surrounding flow.
 */
export function allowedUploadBuckets() {
  return allowedGcsUploadBuckets();
}

/**
 * Runs the gcs uri logic for this module.
 *
 * @param bucketName - Input used by gcs uri.
 * @param objectName - Input used by gcs uri.
 *
 * @returns The result used by the surrounding flow.
 */
export function gcsUri(bucketName: string, objectName: string) {
  return `gcs://${bucketName}/${objectName}`;
}

/**
 * Parses gcs uri from an external value.
 *
 * @param value - Valid GCS URI, for example `gcs://proctorme-uploads/proctor-applications/206/diplomas/file.pdf`.
 *
 * @returns The parsed bucket and object, for example `{ bucketName: "proctorme-uploads", objectName: "proctor-applications/206/diplomas/file.pdf" }`.
 */
export function parseGcsUri(value: string) {
  
  const uriBody = value.slice("gcs://".length);
  const firstSlashIndex = uriBody.indexOf("/");
  return {
    bucketName: uriBody.slice(0, firstSlashIndex),
    objectName: uriBody.slice(firstSlashIndex + 1),
  };
}

/**
 * Checks whether a value has the expected GCS URI shape before parsing external input.
 *
 * @param value - External value, for example a `url` search parameter.
 *
 * @returns True for values like `gcs://proctorme-uploads/proctor-applications/206/diplomas/file.pdf`.
 */
export function isGcsUri(value: string) {
  if (!value.startsWith("gcs://")) return false;
  const uriBody = value.slice("gcs://".length);
  const firstSlashIndex = uriBody.indexOf("/");
  return firstSlashIndex > 0 && firstSlashIndex < uriBody.length - 1;
}

/**
 * Runs the upload private object logic for this module.
 *
 * @param objectName,
  bytes,
  contentType, - Input used by upload private object.
 *
 * @returns The result used by the surrounding flow.
 */
export async function uploadPrivateObject({
  objectName,
  bytes,
  contentType,
}: {
  objectName: string;
  bytes: Buffer;
  contentType: string;
}) {
  const bucketName = getUploadBucketName();
  await storage.bucket(bucketName).file(objectName).save(bytes, {
    contentType,
    resumable: false,
    // That cacheControl is not for the upload request from Next.js to GCS.
    //  It is metadata stored on the GCS object, and GCS can use it later when serving the object.
    // It makes private uploaded files non-cacheable even when GCS serves them directly.
    // Example routes call getPrivateObjectReadUrl(...), then redirect the browser to GCS to fetch the file.

    metadata: {
      cacheControl: "private, max-age=0, no-store",
    },
  });

  return gcsUri(bucketName, objectName);
}

/**
 * Gets private object read url for this flow.
 *
 * @param gcsObjectUri - Private GCS URI, for example `gcs://proctorme-dev-user-uploads-project-6345bbfe/proctor-applications/206/government-ids/id.pdf`.
 * @param expiresInMs - Signed URL lifetime in milliseconds, for example `600000` for 10 minutes.
 *
 * @returns A temporary signed URL, for example `https://storage.googleapis.com/proctorme-dev-user-uploads-project-6345bbfe/proctor-applications/206/government-ids/id.pdf?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Expires=600...`, or null when the URI is not allowed.
 */
export async function getPrivateObjectReadUrl(gcsObjectUri: string, expiresInMs = 10 * 60 * 1000) {
  if (!isGcsUri(gcsObjectUri)) return null;
  const parsed = parseGcsUri(gcsObjectUri);
  // if the bucket is not in the list of allowed buckets, return null
  if (!allowedUploadBuckets().has(parsed.bucketName)) {
    return null;
  }
  // A signed URL is a temporary URL that allows someone to access a private GCS file without making the file public.
  const [url] = await storage
    .bucket(parsed.bucketName)
    .file(parsed.objectName)
    .getSignedUrl({
      action: "read",
      version: "v4",
      expires: Date.now() + expiresInMs,
    });

  return url;
}

/**
 * Runs the download private object logic for this module.
 *
 * @param gcsObjectUri - Input used by download private object.
 *
 * @returns The result used by the surrounding flow.
 */
export async function downloadPrivateObject(gcsObjectUri: string) {
  if (!isGcsUri(gcsObjectUri)) return null;
  const parsed = parseGcsUri(gcsObjectUri);
  if (!allowedUploadBuckets().has(parsed.bucketName)) {
    return null;
  }

  const file = storage.bucket(parsed.bucketName).file(parsed.objectName);
  const [exists] = await file.exists();
  if (!exists) return null;

  const [bytes] = await file.download();
  const [metadata] = await file.getMetadata();
  return {
    bytes,
    contentType: typeof metadata.contentType === "string" ? metadata.contentType : "application/octet-stream",
    objectName: parsed.objectName,
  };
}
