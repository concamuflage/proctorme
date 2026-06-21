import pool from "@/lib/server/database/pool";
import { SITE_NAME } from "@/lib/proctor";
import {
  appBaseUrlFromServerEnv,
  positiveNumberServerEnv,
  resendConfig,
} from "@/lib/server/serverEnv";
import { createToken, hashToken } from "@/lib/server/auth/authTokens";

const DEFAULT_VERIFICATION_TTL_HOURS = 72;

/**
 * Runs the verification ttl hours logic for this module.
 *
 * @returns The result used by the surrounding flow.
 */
function verificationTtlHours() {
  return positiveNumberServerEnv("SCHOOL_EMAIL_VERIFICATION_TTL_HOURS", DEFAULT_VERIFICATION_TTL_HOURS);
}

/**
 * Creates a one-time school email verification token pair and expiration time.
 *
 * The raw token is sent in the email link, while only the hashed token is stored on the education entry.
 * 
 * Example return shape:
 * `{ rawToken: "abc123...", hashedToken: "64-char-sha256-hex...", expiresAt: Date("2026-06-22T12:00:00.000Z") }`.
 *
 * @returns Token values used to build the verification link and persist a safe comparison value.
 */
export function createSchoolEmailVerificationToken() {
  // Reuse the shared auth token primitive for raw token generation, SHA-256 hashing, and expiry math; this wrapper
  // only applies the school-email-specific TTL. Example: 72 hours becomes `createToken(72 * 60 * 60 * 1000)`.
  return createToken(verificationTtlHours() * 60 * 60 * 1000);
}

/**
 * Builds school email verification link for this flow.
 *
 * @param applicationId,
  educationIndex,
  email,
  rawToken, - Input used by build school email verification link.
 *
 * @returns The result used by the surrounding flow.
 */
export function buildSchoolEmailVerificationLink({
  applicationId,
  educationIndex,
  email,
  rawToken,
}: {
  applicationId: number;
  educationIndex: number;
  email: string;
  rawToken: string;
}) {
  const params = new URLSearchParams({
    applicationId: String(applicationId),
    educationIndex: String(educationIndex),
    email,
    token: rawToken,
  });

  return `${appBaseUrlFromServerEnv("APP_BASE_URL")}/verify-school-email?${params.toString()}`;
}

/**
 * Sends school email verification email for this flow.
 *
 * @param to,
  applicantName,
  school,
  verificationLink, - Input used by send school email verification email.
 *
 * @returns The result used by the surrounding flow.
 */
export async function sendSchoolEmailVerificationEmail({
  to,
  applicantName,
  school,
  verificationLink,
}: {
  to: string;
  applicantName: string;
  school: string;
  verificationLink: string;
}) {
  const { apiKey, from } = resendConfig();

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(10_000),
    body: JSON.stringify({
      from,
      to: [to],
      subject: `Verify your school email for ${SITE_NAME}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #18181b;">
          <p>Hi ${applicantName || "there"},</p>
          <p>Please verify this school email address for your ${SITE_NAME} proctor application${school ? ` at ${school}` : ""}.</p>
          <p>
            <a
              href="${verificationLink}"
              style="display:inline-block;padding:12px 20px;background:#18181b;color:#ffffff;text-decoration:none;border-radius:9999px;"
            >
              Verify school email
            </a>
          </p>
          <p>If the button does not work, please copy and paste this link into your browser:</p>
          <p><a href="${verificationLink}">${verificationLink}</a></p>
        </div>
      `,
      text:
        `Hi ${applicantName || "there"},\n\n` +
        `Please verify this school email address for your ${SITE_NAME} proctor application${school ? ` at ${school}` : ""}.\n\n` +
        `${verificationLink}\n`,
    }),
  });

  if (!response.ok) {
    const payload = await response.text().catch(() => "");
    throw new Error(`Resend request failed with status ${response.status}. ${payload}`.trim());
  }
}

/**
 * Parses education from an external value.
 *
 * @param value - Input used by parse education.
 *
 * @returns The parsed value, or null when parsing fails.
 */
function parseEducation(value: unknown) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Runs the verify school email token logic for this module.
 *
 * @param applicationId,
  educationIndex,
  email,
  token, - Input used by verify school email token.
 *
 * @returns The result used by the surrounding flow.
 */
export async function verifySchoolEmailToken({
  applicationId,
  educationIndex,
  email,
  token,
}: {
  applicationId: number;
  educationIndex: number;
  email: string;
  token: string;
}) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!applicationId || educationIndex < 0 || !normalizedEmail || !token) {
    return { ok: false, message: "This school email verification link is incomplete." };
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<{ user_id: unknown; education: unknown }>(
      "SELECT user_id, education FROM proctor_applications WHERE id = $1 FOR UPDATE",
      [applicationId]
    );
    const row = result.rows[0];
    if (!row) {
      await client.query("ROLLBACK");
      return { ok: false, message: "This school email verification link is invalid." };
    }

    const education = parseEducation(row.education).map((item) =>
      typeof item === "object" && item !== null ? { ...(item as Record<string, unknown>) } : {}
    );
    const target = education[educationIndex];
    if (!target) {
      await client.query("ROLLBACK");
      return { ok: false, message: "This school email verification link is invalid." };
    }

    const targetEmail = typeof target.schoolEmail === "string" ? target.schoolEmail.trim().toLowerCase() : "";
    const hashedToken = typeof target.schoolEmailVerificationToken === "string" ? target.schoolEmailVerificationToken : "";
    const expiresAt = typeof target.schoolEmailVerificationExpiresAt === "string"
      ? new Date(target.schoolEmailVerificationExpiresAt)
      : null;
    const isExpired = !expiresAt || expiresAt.getTime() < Date.now();

    if (targetEmail !== normalizedEmail || hashedToken !== hashToken(token) || isExpired) {
      await client.query("ROLLBACK");
      return { ok: false, message: "This school email verification link is invalid or expired." };
    }

    target.schoolEmailVerificationStatus = "verified";
    target.schoolEmailVerificationToken = null;
    target.schoolEmailVerificationExpiresAt = null;
    target.schoolEmailVerifiedAt = new Date().toISOString();

    await client.query(
      "UPDATE proctor_applications SET education = $2::jsonb, updated_at = NOW() WHERE id = $1",
      [applicationId, JSON.stringify(education)]
    );
    await client.query(
      `
        UPDATE user_education
        SET school_email_verification_status = 'verified',
            school_email_verified_at = NOW()
        WHERE user_id = $1
          AND lower(school_email) = $2
      `,
      [Number(row.user_id), normalizedEmail]
    );
    await client.query("COMMIT");
    return { ok: true, message: "School email verified successfully." };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
