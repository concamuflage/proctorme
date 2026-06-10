import { Storage } from "@google-cloud/storage";

const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || undefined,
});

/**
 * Gets upload bucket name for this flow.
 *
 * @returns The result used by the surrounding flow.
 */
export function getUploadBucketName() {
  const explicitBucket = process.env.GCS_UPLOAD_BUCKET;
  if (explicitBucket?.trim()) return explicitBucket.trim();

  const bucketName = process.env.NODE_ENV === "production"
    ? process.env.GCS_UPLOAD_BUCKET_PROD
    : process.env.GCS_UPLOAD_BUCKET_DEV;

  if (!bucketName?.trim()) {
    throw new Error("Missing GCS upload bucket configuration.");
  }

  return bucketName.trim();
}

/**
 * Runs the allowed upload buckets logic for this module.
 *
 * @returns The result used by the surrounding flow.
 */
export function allowedUploadBuckets() {
  return new Set(
    [
      process.env.GCS_UPLOAD_BUCKET,
      process.env.GCS_UPLOAD_BUCKET_DEV,
      process.env.GCS_UPLOAD_BUCKET_PROD,
    ]
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value))
  );
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
 * @param value - Input used by parse gcs uri.
 *
 * @returns The parsed value, or null when parsing fails.
 */
export function parseGcsUri(value: string) {
  const match = value.match(/^gcs:\/\/([^/]+)\/(.+)$/);
  if (!match) return null;
  return {
    bucketName: match[1],
    objectName: match[2],
  };
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
    metadata: {
      cacheControl: "private, max-age=0, no-store",
    },
  });

  return gcsUri(bucketName, objectName);
}

/**
 * Gets private object read url for this flow.
 *
 * @param gcsObjectUri - Input used by get private object read url.
 * @param expiresInMs - Input used by get private object read url.
 *
 * @returns The result used by the surrounding flow.
 */
export async function getPrivateObjectReadUrl(gcsObjectUri: string, expiresInMs = 10 * 60 * 1000) {
  const parsed = parseGcsUri(gcsObjectUri);
  if (!parsed || !allowedUploadBuckets().has(parsed.bucketName)) {
    return null;
  }

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
  const parsed = parseGcsUri(gcsObjectUri);
  if (!parsed || !allowedUploadBuckets().has(parsed.bucketName)) {
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
