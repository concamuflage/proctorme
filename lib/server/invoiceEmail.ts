import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Base URL used as fallback when no valid environment URL is provided in production
const PRODUCTION_APP_BASE_URL = "https://outlierfit.shop";
// Store email that will also receive a copy of the invoice email
const STORE_EMAIL = "unodostreszlm@gmail.com";
const BACKEND_ENV_PATHS = ["backend/.env.local", "backend/.env"];

// Normalizes a base URL by trimming whitespace and removing trailing slashes
function normalizeAppBaseUrl(value: string | undefined) {
  return typeof value === "string" && value.trim() ? value.trim().replace(/\/+$/, "") : "";
}

function readEnvValueFromFile(filePath: string, key: string) {
  try {
    const content = readFileSync(resolve(process.cwd(), filePath), "utf8");
    const line = content
      .split(/\r?\n/)
      .find((entry) => entry.trim().startsWith(`${key}=`));
    if (!line) {
      return "";
    }

    return line
      .slice(line.indexOf("=") + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");
  } catch {
    return "";
  }
}

function invoiceEmailEnv(key: "RESEND_API_KEY" | "RESEND_FROM_EMAIL") {
  return process.env[key] || BACKEND_ENV_PATHS.map((path) => readEnvValueFromFile(path, key)).find(Boolean) || "";
}

// Checks whether a given URL points to a localhost environment
function isLocalhostUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" || parsed.hostname === "::1";
  } catch {
    return false;
  }
}

// Determines the base URL for invoice links based on environment variables
// In production: prefers non-localhost URLs, falls back to a constant
// In development: uses the first available URL or localhost
function getInvoiceAppBaseUrl() {
  const fallbackUrls = [
    normalizeAppBaseUrl(process.env.APP_URL),
    normalizeAppBaseUrl(process.env.NEXTAUTH_URL),
    normalizeAppBaseUrl(process.env.CLIENT_ORIGIN),
  ].filter(Boolean);

  if (process.env.NODE_ENV === "production") {
    return fallbackUrls.find((url) => !isLocalhostUrl(url)) || PRODUCTION_APP_BASE_URL;
  }

  return fallbackUrls[0] || "http://localhost:3000";
}

// Builds the full URL for downloading an invoice PDF for a given order
export function buildInvoicePdfLink(orderId: number) {
  return `${getInvoiceAppBaseUrl()}/api/profile/orders/${encodeURIComponent(String(orderId))}/invoice/pdf`;
}

async function sendResendEmail({
  apiKey,
  from,
  to,
  subject,
  html,
  text,
}: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
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
      text,
    }),
  });

  if (!response.ok) {
    const payload = await response.text().catch(() => "");
    throw new Error(`Resend request failed with status ${response.status}. ${payload}`.trim());
  }
}

// Sends separate customer and store invoice-link emails with tailored copy
export async function sendInvoiceLinkEmail({
  to,
  orderId,
  invoiceNumber,
  paidAt,
}: {
  to: string;
  orderId: number;
  invoiceNumber: string;
  paidAt: string;
}) {
  // Read required configuration from environment variables
  const apiKey = invoiceEmailEnv("RESEND_API_KEY");
  const from = invoiceEmailEnv("RESEND_FROM_EMAIL");

  if (!apiKey || !from) {
    throw new Error("Missing Resend configuration. Set RESEND_API_KEY and RESEND_FROM_EMAIL.");
  }

  // Generate invoice download link
  const invoiceLink = buildInvoicePdfLink(orderId);
  const customerEmail = to.trim();
  // Format payment date for display in email
  const paidDate = new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(paidAt));

  await sendResendEmail({
    apiKey,
    from,
    to: customerEmail,
    subject: `Your OutlierFit invoice ${invoiceNumber}`,
    html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #18181b;">
          <p>Hi there,</p>
          <p>Thank you for your OutlierFit order. Your payment was received on ${paidDate}.</p>
          <p>Your invoice ${invoiceNumber} is ready to download.</p>
          <p>
            <a
              href="${invoiceLink}"
              style="display:inline-block;padding:12px 20px;background:#18181b;color:#ffffff;text-decoration:none;border-radius:9999px;"
            >
              Download invoice
            </a>
          </p>
          <p>If the button does not work, please copy and paste the following link into your browser:</p>
          <p><a href="${invoiceLink}">${invoiceLink}</a></p>
          <p>Thank you for shopping with OutlierFit.</p>
        </div>
      `,
    text:
      `Hi there,\n\n` +
      `Thank you for your OutlierFit order. Your payment was received on ${paidDate}.\n\n` +
      `Your invoice ${invoiceNumber} is ready to download:\n\n` +
      `${invoiceLink}\n\n` +
      `Thank you for shopping with OutlierFit.\n`,
  });

  await sendResendEmail({
    apiKey,
    from,
    to: STORE_EMAIL,
    subject: `Paid order invoice ${invoiceNumber}`,
    html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #18181b;">
          <p>Hi OutlierFit team,</p>
          <p>A customer payment was completed and invoice ${invoiceNumber} is available.</p>
          <p><strong>Customer email:</strong> ${customerEmail}</p>
          <p><strong>Order ID:</strong> ${orderId}</p>
          <p><strong>Paid at:</strong> ${paidDate}</p>
          <p>
            <a
              href="${invoiceLink}"
              style="display:inline-block;padding:12px 20px;background:#18181b;color:#ffffff;text-decoration:none;border-radius:9999px;"
            >
              Open invoice
            </a>
          </p>
          <p>Invoice link:</p>
          <p><a href="${invoiceLink}">${invoiceLink}</a></p>
        </div>
      `,
    text:
      `Hi OutlierFit team,\n\n` +
      `A customer payment was completed and invoice ${invoiceNumber} is available.\n\n` +
      `Customer email: ${customerEmail}\n` +
      `Order ID: ${orderId}\n` +
      `Paid at: ${paidDate}\n\n` +
      `Invoice link:\n\n` +
      `${invoiceLink}\n`,
  });
}
