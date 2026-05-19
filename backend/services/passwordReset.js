const crypto = require("crypto");

const DEFAULT_PASSWORD_RESET_TTL_MINUTES = 30;
const PRODUCTION_APP_BASE_URL = "https://outlierfit.shop";

function getPasswordResetTtlMinutes() {
  const rawValue = Number(process.env.PASSWORD_RESET_TTL_MINUTES || DEFAULT_PASSWORD_RESET_TTL_MINUTES);
  if (!Number.isFinite(rawValue) || rawValue <= 0) {
    return DEFAULT_PASSWORD_RESET_TTL_MINUTES;
  }
  return rawValue;
}

function createPasswordResetToken() {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = hashPasswordResetToken(rawToken);
  const expiresAt = new Date(Date.now() + getPasswordResetTtlMinutes() * 60 * 1000);

  return { rawToken, hashedToken, expiresAt };
}

function hashPasswordResetToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

function normalizeAppBaseUrl(value) {
  return typeof value === "string" && value.trim() ? value.trim().replace(/\/+$/, "") : "";
}

function isLocalhostUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" || parsed.hostname === "::1";
  } catch {
    return false;
  }
}

function getPasswordResetAppBaseUrl() {
  const explicitPasswordResetUrl = normalizeAppBaseUrl(process.env.PASSWORD_RESET_APP_URL);
  if (explicitPasswordResetUrl) return explicitPasswordResetUrl;

  const fallbackUrls = [
    normalizeAppBaseUrl(process.env.CLIENT_ORIGIN),
    normalizeAppBaseUrl(process.env.NEXTAUTH_URL),
  ].filter(Boolean);

  if (process.env.NODE_ENV === "production") {
    return fallbackUrls.find((url) => !isLocalhostUrl(url)) || PRODUCTION_APP_BASE_URL;
  }

  return fallbackUrls[0] || "http://localhost:3000";
}

function buildPasswordResetLink(email, rawToken) {
  const params = new URLSearchParams({
    email,
    token: rawToken,
  });

  return `${getPasswordResetAppBaseUrl()}/reset-password?${params.toString()}`;
}

async function sendPasswordResetEmail({ to, firstName, resetLink }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    throw new Error("Missing Resend configuration. Set RESEND_API_KEY and RESEND_FROM_EMAIL.");
  }

  const greetingName = typeof firstName === "string" && firstName.trim() ? firstName.trim() : "there";
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
      subject: "Reset your OutlierFit password",
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #18181b;">
          <p>Hi ${greetingName},</p>
          <p>We received a request to reset the password for your OutlierFit account.</p>
          <p>This link is valid for 30 minutes.</p>
          <p>
            <a
              href="${resetLink}"
              style="display:inline-block;padding:12px 20px;background:#18181b;color:#ffffff;text-decoration:none;border-radius:9999px;"
            >
              Reset password
            </a>
          </p>
          <p>If the button does not work, please copy and paste the following link into your browser:</p>
          <p><a href="${resetLink}">${resetLink}</a></p>
          <p>If you did not request a password reset, you can safely ignore this email.</p>
        </div>
      `,
      text:
        `Hi ${greetingName},\n\n` +
        `We received a request to reset the password for your OutlierFit account.\n\n` +
        `This link is valid for 30 minutes.\n\n` +
        `Reset password\n\n` +
        `If the button does not work, please copy and paste the following link into your browser:\n\n` +
        `${resetLink}\n\n` +
        `If you did not request a password reset, you can safely ignore this email.\n`,
    }),
  });

  if (!response.ok) {
    const payload = await response.text().catch(() => "");
    throw new Error(`Resend request failed with status ${response.status}. ${payload}`.trim());
  }
}

module.exports = {
  buildPasswordResetLink,
  createPasswordResetToken,
  hashPasswordResetToken,
  sendPasswordResetEmail,
};
