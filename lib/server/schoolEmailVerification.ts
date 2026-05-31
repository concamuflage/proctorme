import crypto from "crypto";
import pool from "@/backend/database/pool";
import { SITE_NAME } from "@/lib/proctor";

const DEFAULT_VERIFICATION_TTL_HOURS = 72;
const PRODUCTION_APP_BASE_URL = "https://outlierfit.shop";

export function normalizeVerificationEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function verificationTtlHours() {
  const rawValue = Number(process.env.SCHOOL_EMAIL_VERIFICATION_TTL_HOURS || DEFAULT_VERIFICATION_TTL_HOURS);
  return Number.isFinite(rawValue) && rawValue > 0 ? rawValue : DEFAULT_VERIFICATION_TTL_HOURS;
}

export function hashSchoolEmailVerificationToken(token: string) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

export function createSchoolEmailVerificationToken() {
  const rawToken = crypto.randomBytes(32).toString("hex");
  return {
    rawToken,
    hashedToken: hashSchoolEmailVerificationToken(rawToken),
    expiresAt: new Date(Date.now() + verificationTtlHours() * 60 * 60 * 1000),
  };
}

function normalizeAppBaseUrl(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim().replace(/\/+$/, "") : "";
}

function isLocalhostUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" || parsed.hostname === "::1";
  } catch {
    return false;
  }
}

function appBaseUrl() {
  const explicitEmailUrl = normalizeAppBaseUrl(process.env.SCHOOL_EMAIL_VERIFICATION_APP_URL);
  if (explicitEmailUrl) return explicitEmailUrl;

  const fallbackUrls = [
    normalizeAppBaseUrl(process.env.CLIENT_ORIGIN),
    normalizeAppBaseUrl(process.env.NEXTAUTH_URL),
  ].filter(Boolean);

  if (process.env.NODE_ENV === "production") {
    return fallbackUrls.find((url) => !isLocalhostUrl(url)) || PRODUCTION_APP_BASE_URL;
  }

  return fallbackUrls[0] || "http://localhost:3000";
}

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

  return `${appBaseUrl()}/verify-school-email?${params.toString()}`;
}

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
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    throw new Error("Missing Resend configuration. Set RESEND_API_KEY and RESEND_FROM_EMAIL.");
  }

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
  const normalizedEmail = normalizeVerificationEmail(email);
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

    const targetEmail = normalizeVerificationEmail(target.schoolEmail);
    const hashedToken = typeof target.schoolEmailVerificationToken === "string" ? target.schoolEmailVerificationToken : "";
    const expiresAt = typeof target.schoolEmailVerificationExpiresAt === "string"
      ? new Date(target.schoolEmailVerificationExpiresAt)
      : null;
    const isExpired = !expiresAt || expiresAt.getTime() < Date.now();

    if (targetEmail !== normalizedEmail || hashedToken !== hashSchoolEmailVerificationToken(token) || isExpired) {
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
