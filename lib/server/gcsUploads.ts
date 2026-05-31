import { Storage } from "@google-cloud/storage";

const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || undefined,
});

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

export function gcsUri(bucketName: string, objectName: string) {
  return `gcs://${bucketName}/${objectName}`;
}

export function parseGcsUri(value: string) {
  const match = value.match(/^gcs:\/\/([^/]+)\/(.+)$/);
  if (!match) return null;
  return {
    bucketName: match[1],
    objectName: match[2],
  };
}

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
