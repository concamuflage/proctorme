import crypto from "crypto";

/**
 * Hashes a one-time auth token before database storage.
 *
 * @param token - Raw token sent to the user.
 * @returns SHA-256 hash used for database comparison.
 */
export function hashToken(token: string) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

/**
 * Creates a secure random token, its database-safe hash, and expiration time.
 *
 * @param ttlMs - Time-to-live in milliseconds.
 * @returns Raw token for the user link, hashed token for storage, and expiry.
 */
export function createToken(ttlMs: number) {
  const rawToken = crypto.randomBytes(32).toString("hex");
  return {
    rawToken,
    hashedToken: hashToken(rawToken),
    expiresAt: new Date(Date.now() + ttlMs),
  };
}
