/**
 * Maximum size for every user-uploaded file.
 *
 * Example value: `5 * 1024 * 1024` equals 5 MB in bytes, used for diplomas, government IDs, organization documents, and profile images.
 */
export const MAX_UPLOAD_FILE_BYTES = 5 * 1024 * 1024;

/**
 * MIME types allowed for document-like uploads such as diplomas, government IDs, and organization documents.
 *
 * Example allowed values: `application/pdf`, `image/jpeg`, and `image/png`.
 */
export const ALLOWED_DOCUMENT_FILE_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);

/**
 * MIME types allowed for profile image uploads.
 *
 * Example allowed values: `image/jpeg`, `image/png`, and `image/webp`.
 */
export const ALLOWED_PROFILE_IMAGE_FILE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
