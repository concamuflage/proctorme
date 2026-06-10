import "../../../lib/server/config/env.js";

type GmailHeader = {
  name: string;
  value: string;
};

type GmailPart = {
  body?: {
    data?: string;
  };
  parts?: GmailPart[];
};

type GmailMessage = {
  id: string;
  internalDate?: string;
  payload?: {
    headers?: GmailHeader[];
    body?: {
      data?: string;
    };
    parts?: GmailPart[];
  };
};

export type VerificationEmail = {
  verificationLink: string;
  from: string;
};

type FindVerificationEmailOptions = {
  timeoutMs?: number;
  pollIntervalMs?: number;
};

const verificationLinkPattern = /https?:\/\/[^\s"'<>]+\/verify-email\?[^\s"'<>]+/g;

/**
 * Requires d env value before allowing this flow to continue.
 *
 * @param name - Input used by required env value.
 *
 * @returns The result used by the surrounding flow.
 */
function requiredEnvValue(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment value: ${name}`);
  return value;
}

/**
 * Runs the expected resend from email logic for this module.
 *
 * @returns The result used by the surrounding flow.
 */
export function expectedResendFromEmail() {
  return requiredEnvValue("RESEND_FROM_EMAIL");
}

/**
 * Runs the encode query logic for this module.
 *
 * @param value - Input used by encode query.
 *
 * @returns The result used by the surrounding flow.
 */
function encodeQuery(value: string) {
  return encodeURIComponent(value);
}

/**
 * Runs the quote gmail term logic for this module.
 *
 * @param value - Input used by quote gmail term.
 *
 * @returns The result used by the surrounding flow.
 */
function quoteGmailTerm(value: string) {
  return `"${value.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"")}"`;
}

/**
 * Runs the decode html entities logic for this module.
 *
 * @param value - Input used by decode html entities.
 *
 * @returns The result used by the surrounding flow.
 */
function decodeHtmlEntities(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'");
}

/**
 * Runs the base64 url decode logic for this module.
 *
 * @param value - Input used by base64 url decode.
 *
 * @returns The result used by the surrounding flow.
 */
function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

/**
 * Runs the collect body parts logic for this module.
 *
 * @param part - Input used by collect body parts.
 * @param body - Input used by collect body parts.
 *
 * @returns The result used by the surrounding flow.
 */
function collectBodyParts(part: GmailPart | undefined, body: string[]) {
  if (!part) return;

  if (part.body?.data) {
    body.push(base64UrlDecode(part.body.data));
  }

  for (const child of part.parts ?? []) {
    collectBodyParts(child, body);
  }
}

/**
 * Runs the message body logic for this module.
 *
 * @param message - Input used by message body.
 *
 * @returns The result used by the surrounding flow.
 */
function messageBody(message: GmailMessage) {
  const body: string[] = [];
  collectBodyParts(message.payload, body);
  return body.join("\n");
}

/**
 * Runs the header value logic for this module.
 *
 * @param message - Input used by header value.
 * @param headerName - Input used by header value.
 *
 * @returns The result used by the surrounding flow.
 */
function headerValue(message: GmailMessage, headerName: string) {
  const header = message.payload?.headers?.find((item) => item.name.toLowerCase() === headerName.toLowerCase());
  return header?.value ?? "";
}

/**
 * Runs the access token logic for this module.
 *
 * @returns The result used by the surrounding flow.
 */
async function accessToken() {
  const configuredAccessToken = process.env.GMAIL_ACCESS_TOKEN;
  if (configuredAccessToken) return configuredAccessToken;

  const refreshToken = requiredEnvValue("GMAIL_REFRESH_TOKEN");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: requiredEnvValue("GOOGLE_CLIENT_ID"),
      client_secret: requiredEnvValue("GOOGLE_CLIENT_SECRET"),
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Google token request failed with ${response.status}: ${JSON.stringify(payload)}`);
  }

  if (!payload?.access_token) {
    throw new Error("Google token response did not include access_token.");
  }

  return String(payload.access_token);
}

/**
 * Gets json for this flow.
 *
 * @param url - Input used by get json.
 * @param token - Input used by get json.
 *
 * @returns The result used by the surrounding flow.
 */
async function getJson<T>(url: string, token: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`${url} failed with ${response.status}: ${JSON.stringify(payload)}`);
  }

  return payload as T;
}

/**
 * Runs the extract verification link logic for this module.
 *
 * @param message - Input used by extract verification link.
 *
 * @returns The result used by the surrounding flow.
 */
function extractVerificationLink(message: GmailMessage) {
  const body = messageBody(message);
  for (const match of body.matchAll(verificationLinkPattern)) {
    const link = match[0];
    if (link.includes("email=") && link.includes("token=")) {
      return decodeHtmlEntities(link);
    }
  }

  return null;
}

/**
 * Runs the sleep logic for this module.
 *
 * @param ms - Input used by sleep.
 *
 * @returns The result used by the surrounding flow.
 */
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Runs the find verification email once logic for this module.
 *
 * @param token - Input used by find verification email once.
 * @param recipientEmail - Input used by find verification email once.
 *
 * @returns The result used by the surrounding flow.
 */
async function findVerificationEmailOnce(
  token: string,
  recipientEmail: string
) {
  const quotedRecipient = quoteGmailTerm(recipientEmail);
  const query = `to:${quotedRecipient} subject:"Verify your ProctorMe account" newer_than:14d`;
  const listUrl = "https://gmail.googleapis.com/gmail/v1/users/me/messages"
    + "?maxResults=10"
    + "&includeSpamTrash=true"
    + `&q=${encodeQuery(query)}`;

  const listPayload = await getJson<{ messages?: Array<{ id: string }> }>(listUrl, token);
  if (!listPayload.messages?.length) {
    return null;
  }

  const candidates: Array<VerificationEmail & { sentAt: number }> = [];

  for (const messageSummary of listPayload.messages) {
    const message = await getJson<GmailMessage>(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageSummary.id}?format=full`,
      token
    );
    const verificationLink = extractVerificationLink(message);
    if (verificationLink) {
      const sentAt = Number(message.internalDate || 0);
      candidates.push({
        verificationLink,
        from: headerValue(message, "From"),
        sentAt,
      });
    }
  }

  candidates.sort((left, right) => right.sentAt - left.sentAt);

  if (candidates[0]) {
    return {
      verificationLink: candidates[0].verificationLink,
      from: candidates[0].from,
    };
  }

  return null;
}

/**
 * Runs the find latest verification email logic for this module.
 *
 * @param recipientEmail - Input used by find latest verification email.
 * @param options - Input used by find latest verification email.
 *
 * @returns The result used by the surrounding flow.
 */
export async function findLatestVerificationEmail(
  recipientEmail: string,
  options: FindVerificationEmailOptions = {}
): Promise<VerificationEmail> {
  const token = await accessToken();
  const timeoutMs = options.timeoutMs ?? 45_000;
  const pollIntervalMs = options.pollIntervalMs ?? 3_000;
  const deadline = Date.now() + timeoutMs;

  do {
    const email = await findVerificationEmailOnce(token, recipientEmail);
    if (email) return email;
    await sleep(pollIntervalMs);
  } while (Date.now() < deadline);

  throw new Error("Gmail messages were found, but none contained a verification link.");
}
