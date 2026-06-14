import { SITE_NAME } from "@/lib/proctor";
import {
  appBaseUrlFromServerEnv,
  resendConfig,
} from "@/lib/server/serverEnv";

const PRODUCTION_APP_BASE_URL = "https://outlierfit.shop";

/**
 * Chooses the public app URL used in email links.
 *
 * @param explicitEnvName - Environment variable that can explicitly set this link base.
 * @returns Public app base URL.
 */
function appBaseUrl(explicitEnvName: string) {
  return appBaseUrlFromServerEnv({
    explicitEnvName,
    fallbackEnvNames: ["CLIENT_ORIGIN", "NEXTAUTH_URL"],
    productionFallback: PRODUCTION_APP_BASE_URL,
  });
}

/**
 * Builds the email verification URL sent after signup or resend requests.
 *
 * @param email - Normalized email address.
 * @param token - Raw verification token.
 * @returns Absolute verification URL.
 */
export function buildEmailVerificationLink(email: string, token: string) {
  const params = new URLSearchParams({ email, token });
  return `${appBaseUrl("EMAIL_VERIFICATION_APP_URL")}/verify-email?${params.toString()}`;
}

/**
 * Builds the password reset URL sent to users who request a reset.
 *
 * @param email - Normalized email address.
 * @param token - Raw reset token.
 * @returns Absolute reset URL.
 */
export function buildPasswordResetLink(email: string, token: string) {
  const params = new URLSearchParams({ email, token });
  return `${appBaseUrl("PASSWORD_RESET_APP_URL")}/reset-password?${params.toString()}`;
}

/**
 * Sends an email through Resend using both HTML and plain-text bodies.
 *
 * @param message - Email destination, subject, HTML body, and plain text body.
 * @returns Promise that resolves when Resend accepts the email.
 */
async function sendResendEmail({
  to,
  subject,
  html,
  plainText,
}: {
  to: string;
  subject: string;
  html: string;
  plainText: string;
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
      subject,
      html,
      text: plainText,
    }),
  });

  if (!response.ok) {
    const payload = await response.text().catch(() => "");
    throw new Error(`Resend request failed with status ${response.status}. ${payload}`.trim());
  }
}

/**
 * Sends the email verification link for a local account.
 *
 * @param input - Email, first name, and absolute verification URL.
 * @returns Promise that resolves when the email is sent.
 */
export async function sendEmailVerificationEmail({
  email,
  firstName,
  verificationLink,
}: {
  email: string;
  firstName: string;
  verificationLink: string;
}) {
  await sendResendEmail({
    to: email,
    subject: `Verify your ${SITE_NAME} account`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #18181b;">
        <p>Hi ${firstName},</p>
        <p>Welcome to ${SITE_NAME}, and thank you for creating an account with us.</p>
        <p>To finish setting up your account, please verify your email address by clicking the button below.</p>
        <p><a href="${verificationLink}" style="display:inline-block;padding:12px 20px;background:#18181b;color:#ffffff;text-decoration:none;border-radius:9999px;">Verify email</a></p>
        <p>If the button does not work, please copy and paste this link into your browser:</p>
        <p><a href="${verificationLink}">${verificationLink}</a></p>
      </div>
    `,
    plainText: `Hi ${firstName},\n\nWelcome to ${SITE_NAME}.\n\nVerify your email:\n${verificationLink}\n`,
  });
}

/**
 * Sends the password reset link for a local account.
 *
 * @param input - Email, first name, reset URL, and token lifetime in minutes.
 * @returns Promise that resolves when the email is sent.
 */
export async function sendPasswordResetEmail({
  email,
  firstName,
  resetLink,
  ttlMinutes,
}: {
  email: string;
  firstName: string;
  resetLink: string;
  ttlMinutes: number;
}) {
  await sendResendEmail({
    to: email,
    subject: `Reset your ${SITE_NAME} password`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #18181b;">
        <p>Hi ${firstName},</p>
        <p>We received a request to reset the password for your ${SITE_NAME} account.</p>
        <p>This link is valid for ${ttlMinutes} minutes.</p>
        <p><a href="${resetLink}" style="display:inline-block;padding:12px 20px;background:#18181b;color:#ffffff;text-decoration:none;border-radius:9999px;">Reset password</a></p>
        <p>If the button does not work, please copy and paste this link into your browser:</p>
        <p><a href="${resetLink}">${resetLink}</a></p>
      </div>
    `,
    plainText: `Hi ${firstName},\n\nReset your ${SITE_NAME} password:\n${resetLink}\n`,
  });
}
