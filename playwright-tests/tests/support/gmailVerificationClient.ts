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

function requiredEnvValue(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment value: ${name}`);
  return value;
}

export function expectedResendFromEmail() {
  return requiredEnvValue("RESEND_FROM_EMAIL");
}

function encodeQuery(value: string) {
  return encodeURIComponent(value);
}

function quoteGmailTerm(value: string) {
  return `"${value.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"")}"`;
}

function decodeHtmlEntities(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", "\"")
    .replaceAll("&#39;", "'");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function collectBodyParts(part: GmailPart | undefined, body: string[]) {
  if (!part) return;

  if (part.body?.data) {
    body.push(base64UrlDecode(part.body.data));
  }

  for (const child of part.parts ?? []) {
    collectBodyParts(child, body);
  }
}

function messageBody(message: GmailMessage) {
  const body: string[] = [];
  collectBodyParts(message.payload, body);
  return body.join("\n");
}

function headerValue(message: GmailMessage, headerName: string) {
  const header = message.payload?.headers?.find((item) => item.name.toLowerCase() === headerName.toLowerCase());
  return header?.value ?? "";
}

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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
