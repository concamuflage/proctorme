import crypto from "crypto";
import pool from "@/backend/database/pool";
import { SITE_NAME } from "@/lib/proctor";

const DEFAULT_VERIFICATION_TTL_HOURS = 72;
const PRODUCTION_APP_BASE_URL = "https://outlierfit.shop";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeOrganizationEmail(value: unknown) {
  return text(value).toLowerCase();
}

function verificationTtlHours() {
  const rawValue = Number(process.env.ORGANIZATION_EMAIL_VERIFICATION_TTL_HOURS || DEFAULT_VERIFICATION_TTL_HOURS);
  return Number.isFinite(rawValue) && rawValue > 0 ? rawValue : DEFAULT_VERIFICATION_TTL_HOURS;
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
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
  const explicitEmailUrl = normalizeAppBaseUrl(process.env.ORGANIZATION_EMAIL_VERIFICATION_APP_URL);
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

function buildVerificationLink({ email, rawToken }: { email: string; rawToken: string }) {
  const params = new URLSearchParams({ email, token: rawToken });
  return `${appBaseUrl()}/verify-organization-email?${params.toString()}`;
}

async function sendOrganizationEmailVerificationEmail({
  to,
  organizationName,
  verificationLink,
}: {
  to: string;
  organizationName: string;
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
      subject: `Verify your organization email for ${SITE_NAME}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #18181b;">
          <p>Please verify this organization email address for ${organizationName || "your organization"} on ${SITE_NAME}.</p>
          <p>
            <a href="${verificationLink}" style="display:inline-block;padding:12px 20px;background:#18181b;color:#ffffff;text-decoration:none;border-radius:9999px;">
              Verify organization email
            </a>
          </p>
          <p>If the button does not work, copy and paste this link into your browser:</p>
          <p><a href="${verificationLink}">${verificationLink}</a></p>
        </div>
      `,
      text:
        `Please verify this organization email address for ${organizationName || "your organization"} on ${SITE_NAME}.\n\n` +
        `${verificationLink}\n`,
    }),
  });

  if (!response.ok) {
    const payload = await response.text().catch(() => "");
    throw new Error(`Resend request failed with status ${response.status}. ${payload}`.trim());
  }
}

export async function sendOrganizationEmailVerification({
  userId,
  organizationEmail,
  organizationName,
}: {
  userId: number;
  organizationEmail: string;
  organizationName: string;
}) {
  const email = normalizeOrganizationEmail(organizationEmail);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("A valid organization email is required.");

  const rawToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + verificationTtlHours() * 60 * 60 * 1000);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `
        UPDATE organization_email_verifications
        SET verification_status = 'superseded',
            token_hash = NULL,
            updated_at = NOW()
        WHERE user_id = $1
          AND lower(organization_email) = $2
          AND verification_status IN ('pending', 'verified')
      `,
      [userId, email]
    );
    await client.query(
      `
        INSERT INTO organization_email_verifications (
          user_id,
          organization_email,
          token_hash,
          verification_status,
          verification_expires_at,
          verification_sent_at,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, 'pending', $4, NOW(), NOW(), NOW())
      `,
      [userId, email, hashToken(rawToken), expiresAt]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  await sendOrganizationEmailVerificationEmail({
    to: email,
    organizationName,
    verificationLink: buildVerificationLink({ email, rawToken }),
  });

  return { status: "pending", sentAt: new Date().toISOString() };
}

export async function verifyOrganizationEmailToken({ email, token }: { email: string; token: string }) {
  const normalizedEmail = normalizeOrganizationEmail(email);
  if (!normalizedEmail || !token) return { ok: false, message: "This organization email verification link is incomplete." };

  const result = await pool.query<{ id: unknown; token_hash: unknown; verification_expires_at: unknown }>(
    `
      SELECT id, token_hash, verification_expires_at
      FROM organization_email_verifications
      WHERE lower(organization_email) = $1
        AND verification_status = 'pending'
      ORDER BY verification_sent_at DESC NULLS LAST, id DESC
      LIMIT 1
    `,
    [normalizedEmail]
  );
  const row = result.rows[0];
  if (!row) return { ok: false, message: "This organization email verification link is invalid." };

  const expiresAt = row.verification_expires_at instanceof Date ? row.verification_expires_at : new Date(String(row.verification_expires_at || ""));
  if (text(row.token_hash) !== hashToken(token) || !Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
    return { ok: false, message: "This organization email verification link is invalid or expired." };
  }

  await pool.query(
    `
      UPDATE organization_email_verifications
      SET verification_status = 'verified',
          token_hash = NULL,
          verified_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
    `,
    [Number(row.id)]
  );

  return { ok: true, message: "Organization email verified successfully." };
}

export async function getVerifiedOrganizationEmailStatus(userId: number, organizationEmail: string) {
  const email = normalizeOrganizationEmail(organizationEmail);
  if (!email) return null;

  const result = await pool.query<{ verification_status: unknown; verification_sent_at: unknown; verified_at: unknown }>(
    `
      SELECT verification_status, verification_sent_at, verified_at
      FROM organization_email_verifications
      WHERE user_id = $1
        AND lower(organization_email) = $2
      ORDER BY verification_sent_at DESC NULLS LAST, id DESC
      LIMIT 1
    `,
    [userId, email]
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    status: text(row.verification_status) || "not_provided",
    sentAt: row.verification_sent_at instanceof Date ? row.verification_sent_at.toISOString() : text(row.verification_sent_at),
    verifiedAt: row.verified_at instanceof Date ? row.verified_at.toISOString() : text(row.verified_at),
  };
}
