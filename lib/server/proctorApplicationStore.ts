import pool from "@/lib/server/database/pool";
import {
  buildSchoolEmailVerificationLink,
  createSchoolEmailVerificationToken,
  sendSchoolEmailVerificationEmail,
} from "@/lib/server/schoolEmailVerification";

export type ProctorApplicationStatus = "draft" | "pending" | "approved" | "rejected";

export const LOCKED_PROCTOR_APPLICATION_MESSAGE = "This proctor application is already pending or approved and cannot be edited.";

export type ProctorApplicationEducation = {
  degree: string;
  school: string;
  major: string;
  startMonth: string;
  endMonth: string;
  diplomaUrl: string;
  schoolEmail: string;
  educationVerificationAuthorized: boolean;
  schoolEmailVerificationStatus: "not_provided" | "pending" | "verified";
  schoolEmailVerificationSentAt?: string;
  schoolEmailVerifiedAt?: string;
  schoolEmailVerificationToken?: string | null;
  schoolEmailVerificationExpiresAt?: string | null;
};

export type ProctorApplicationInput = {
  profession: string;
  gender: string;
  ethnicity: string;
  dateOfBirth: string;
  bio: string;
  street: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  timezone: string;
  hourlyRate: number;
  minimumHours: number;
  maximumHours: number;
  education: ProctorApplicationEducation[];
  imageUrls: string[];
  governmentIdUrls: string[];
};

type ApplicationRow = {
  id: unknown;
  user_id: unknown;
  email?: unknown;
  first_name?: unknown;
  last_name?: unknown;
  status: unknown;
  profession: unknown;
  gender: unknown;
  ethnicity_name?: unknown;
  date_of_birth?: unknown;
  bio: unknown;
  street: unknown;
  city: unknown;
  state: unknown;
  country: unknown;
  zip_code: unknown;
  timezone_name?: unknown;
  hourly_rate: unknown;
  minimum_hours: unknown;
  maximum_hours: unknown;
  education: unknown;
  image_urls: unknown;
  government_id_urls?: unknown;
  submitted_at: unknown;
  reviewed_at: unknown;
  review_note: unknown;
};

/**
 * Runs the text logic for this module.
 * Do we even need this text()?
 *
 * @param value - Input used by text.
 *
 * @returns The result used by the surrounding flow.
 */
function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Converts a value to number.
 *
 * @param value - Input used by to number.
 *
 * @returns The result used by the surrounding flow.
 */
function toNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value);
}

/**
 * Runs the positive number logic for this module.
 *
 * @param value - Input used by positive number.
 * @param fallback - Input used by positive number.
 *
 * @returns The result used by the surrounding flow.
 */
function positiveNumber(value: unknown, fallback: number) {
  const number = toNumber(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

/**
 * Parses an external value into an array.
 *
 * Before and after examples:
 * - `[{ degree: "Bachelor's Degree" }]` returns `[{ degree: "Bachelor's Degree" }]`.
 * - `"[{\"degree\":\"Bachelor's Degree\"}]"` returns `[{ degree: "Bachelor's Degree" }]`.
 * - `"not-json"` returns `[]`.
 * - `{ degree: "Bachelor's Degree" }` returns `[]` because the parsed value is not an array.
 *
 * @param value - Possible array or JSON string, for example the `education` jsonb value from `proctor_applications`.
 *
 * @returns The parsed array, or `[]` when the value is missing, invalid, or not an array.
 */
function parseJsonArray(value: unknown) {
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
 * Converts a possible JSON array into a cleaned string array.
 *
 * Example: `[" diploma.pdf ", 123, "", null, "profile.png"]` returns `["diploma.pdf", "profile.png"]`.
 *
 * @param value - Possible array or JSON string, for example `"[\" diploma.pdf \", \"profile.png\"]"`.
 *
 * @returns Trimmed non-empty string values.
 */
function textArray(value: unknown) {
  // text is the function
  return parseJsonArray(value).map(text).filter(Boolean);
}

/**
 * Reads one diploma URL from current or legacy education JSON.
 *
 * Current payloads send `{ diplomaUrl: "gcs://bucket/path/diploma.pdf" }`.
 * Legacy drafts may still contain `{ diplomaUrls: ["gcs://bucket/path/diploma.pdf"] }`.
 *
 * @param item - Raw education object from stored JSON or request payload.
 *
 * @returns The single diploma URL, or `""` when no diploma exists.
 */
function singleDiplomaUrl(item: Record<string, unknown>) {
  return text(item.diplomaUrl) || textArray(item.diplomaUrls)[0] || "";
}

/**
 * Normalizes month into the shape this flow expects.
 *
 * @param value - Input used by normalize month.
 *
 * @returns The normalized value.
 */
function normalizeMonth(value: string) {
  const trimmed = value.trim();
  return /^\d{4}-\d{2}$/.test(trimmed) ? `${trimmed}-01` : null;
}

/**
 * Normalizes date into the shape this flow expects.
 *
 * @param value - Input used by normalize date.
 *
 * @returns The normalized value.
 */
function normalizeDate(value: unknown) {
  const trimmed = text(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : "";
}

/**
 * Checks whether at least age is true for this flow.
 *
 * @param dateOfBirth - Input used by is at least age.
 * @param age - Input used by is at least age.
 *
 * @returns True when the value satisfies the check.
 */
function isAtLeastAge(dateOfBirth: string, age: number) {
  const [year, month, day] = dateOfBirth.split("-").map(Number);
  const birthDate = new Date(Date.UTC(year, month - 1, day));
  if (!Number.isFinite(birthDate.getTime())) return false;

  const today = new Date();
  const threshold = new Date(Date.UTC(today.getUTCFullYear() - age, today.getUTCMonth(), today.getUTCDate()));
  return birthDate.getTime() <= threshold.getTime();
}

/**
 * Runs the upsert submitted location ids logic for this module.
 *
 * @param client - Input used by upsert submitted location ids.
 * @param input - Input used by upsert submitted location ids.
 *
 * @returns The result used by the surrounding flow.
 */
async function upsertSubmittedLocationIds(client: typeof pool, input: Pick<ProctorApplicationInput, "city" | "state">) {
  const countryResult = await client.query<{ id: unknown }>(
    `
      SELECT id
      FROM countries
      WHERE country = 'United States'
      LIMIT 1
    `
  );
  const countryId = countryResult.rows[0]?.id == null ? null : toNumber(countryResult.rows[0].id);
  if (!countryId) throw new Error("United States is not configured.");

  const stateResult = await client.query<{ id: unknown }>(
    `
      SELECT id
      FROM states
      WHERE country_id = $1
        AND code = $2
      LIMIT 1
    `,
    [countryId, input.state]
  );
  const stateId = stateResult.rows[0]?.id == null ? null : toNumber(stateResult.rows[0].id);
  if (!stateId) throw new Error("Selected state is not configured.");

  const cityResult = await client.query<{ id: unknown }>(
    `
      INSERT INTO cities (state_id, name)
      VALUES ($1, $2)
      ON CONFLICT (state_id, name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `,
    [stateId, input.city]
  );
  const cityId = toNumber(cityResult.rows[0].id);
  return { countryId, stateId, cityId };
}

/**
 * Runs the cache submitted location time zone logic for this module.
 *
 * @param client - Input used by cache submitted location time zone.
 * @param location - Input used by cache submitted location time zone.
 * @param timezoneName - Input used by cache submitted location time zone.
 *
 * @returns The result used by the surrounding flow.
 */
async function cacheSubmittedLocationTimeZone(client: typeof pool, location: { countryId: number; stateId: number; cityId: number }, timezoneName: string) {
  if (!timezoneName) return;
  const timezoneResult = await client.query<{ id: unknown }>(
    "SELECT id FROM timezones WHERE name = $1 LIMIT 1",
    [timezoneName]
  );
  const timezoneId = timezoneResult.rows[0]?.id == null ? null : toNumber(timezoneResult.rows[0].id);
  if (!timezoneId) return;

  await client.query(
    `
      INSERT INTO city_timezones (city_id, state_id, country_id, timezone_id, source, created_at, updated_at)
      VALUES ($1, $2, $3, $4, 'application', NOW(), NOW())
      ON CONFLICT (city_id, state_id, country_id) DO UPDATE
        SET timezone_id = EXCLUDED.timezone_id,
            source = EXCLUDED.source,
            updated_at = NOW()
    `,
    [location.cityId, location.stateId, location.countryId, timezoneId]
  );
}

/**
 * Gets existing degree id for this flow.
 *
 * @param client - Input used by get existing degree id.
 * @param name - Input used by get existing degree id.
 *
 * @returns The result used by the surrounding flow.
 */
async function getExistingDegreeId(client: typeof pool, name: string) {
  const result = await client.query<{ id: unknown }>(
    "SELECT id FROM degrees WHERE name = $1 LIMIT 1",
    [name]
  );
  return result.rows[0]?.id == null ? null : toNumber(result.rows[0].id);
}

/**
 * Runs the upsert named logic for this module.
 *
 * @param client - Input used by upsert named.
 * @param table - Input used by upsert named.
 * @param name - Input used by upsert named.
 *
 * @returns The result used by the surrounding flow.
 */
async function upsertNamed(client: typeof pool, table: "professions" | "genders" | "schools" | "majors", name: string) {
  const result = await client.query<{ id: unknown }>(
    `INSERT INTO ${table} (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
    [name]
  );
  return toNumber(result.rows[0].id);
}

/**
 * Gets existing named id for this flow.
 *
 * @param client - Input used by get existing named id.
 * @param table - Input used by get existing named id.
 * @param name - Input used by get existing named id.
 *
 * @returns The result used by the surrounding flow.
 */
async function getExistingNamedId(client: typeof pool, table: "professions" | "genders" | "ethnicities", name: string) {
  const result = await client.query<{ id: unknown }>(
    `SELECT id FROM ${table} WHERE name = $1 LIMIT 1`,
    [name]
  );
  return result.rows[0]?.id == null ? null : toNumber(result.rows[0].id);
}

/**
 * Converts a database row into the client/admin proctor application shape.
 *
 * Before mapping, the database row uses SQL column names and JSON values, for example:
 * {
 *   id: 206,
 *   user_id: 42,
 *   timezone_name: "America/New_York",
 *   education: "[{\"degree\":\"Bachelor's Degree\",\"diplomaUrl\":\"gcs://bucket/path/diploma.pdf\"}]",
 *   image_urls: "[\"gcs://bucket/path/profile.png\"]"
 * }
 *
 * After mapping, the application uses browser-facing camelCase fields, for example:
 * {
 *   id: 206,
 *   userId: 42,
 *   timezone: "America/New_York",
 *   education: [{ degree: "Bachelor's Degree", diplomaUrl: "gcs://bucket/path/diploma.pdf" }],
 *   imageUrls: ["gcs://bucket/path/profile.png"]
 * }
 *
 * @param row - Joined `proctor_applications` row, for example one row containing `education` JSON and `timezone_name`.
 *
 * @returns A normalized application object with parsed arrays, display names, and ISO-like dates.
 */
function mapApplication(row: ApplicationRow) {
  const firstName = text(row.first_name);
  const lastName = text(row.last_name);
  // `education` is stored as JSON data in the database; parse it into an array before normalizing each entry.
  // education is an array of objects
  const education = parseJsonArray(row.education)
    // Keep only object entries. If the JSON array somehow contains strings/numbers/null, skip them safely.

    // Example: [{ degree: "Bachelor's Degree" }, null, "bad value", 123] 
    // becomes [{ degree: "Bachelor's Degree" }, null, null, null] before the filter below removes nulls.
    .map((item) => (typeof item === "object" && item !== null ? item as Record<string, unknown> : null))
    // type predicate
    .filter((item): item is Record<string, unknown> => item !== null)
    // Convert each raw stored education object into the shape consumed by the account and admin UIs.
    .map((item) => ({
      // text():Text fields are trimmed; missing or non-string values become "" instead of leaking raw database values.
      degree: text(item.degree),
      school: text(item.school),
      major: text(item.major),
      startMonth: text(item.startMonth),
      endMonth: text(item.endMonth),
      // Each education row allows one diploma; old `diplomaUrls` arrays are collapsed to their first value.
      diplomaUrl: singleDiplomaUrl(item),
      // School emails are normalized before display/comparison so casing and whitespace stay consistent.
      schoolEmail: text(item.schoolEmail).toLowerCase(),
      // Only a real boolean true means the user authorized verification; every other value is treated as false.
      educationVerificationAuthorized: item.educationVerificationAuthorized === true,
      // Only expose statuses the UI understands. Unknown or missing status values become "not_provided".
      schoolEmailVerificationStatus: text(item.schoolEmailVerificationStatus) === "verified"
        ? "verified" as const
        : text(item.schoolEmail).toLowerCase()
          ? "pending" as const
          : "not_provided" as const,
      // Verification timestamps are optional display metadata; invalid or missing values become empty strings.
      schoolEmailVerificationSentAt: text(item.schoolEmailVerificationSentAt),
      schoolEmailVerifiedAt: text(item.schoolEmailVerifiedAt),
    }));
  return {
    id: toNumber(row.id),
    userId: toNumber(row.user_id),
    applicantName: [firstName, lastName].filter(Boolean).join(" "),
    applicantEmail: text(row.email),
    status: text(row.status) as ProctorApplicationStatus,
    profession: text(row.profession),
    gender: text(row.gender),
    ethnicity: text(row.ethnicity_name),
    dateOfBirth: row.date_of_birth instanceof Date ? row.date_of_birth.toISOString().slice(0, 10) : normalizeDate(row.date_of_birth),
    bio: text(row.bio),
    street: text(row.street),
    city: text(row.city),
    state: text(row.state),
    country: text(row.country),
    zipCode: text(row.zip_code),
    timezone: text(row.timezone_name),
    hourlyRate: positiveNumber(row.hourly_rate, 0),
    minimumHours: positiveNumber(row.minimum_hours, 1),
    maximumHours: positiveNumber(row.maximum_hours, 1),
    education,
    imageUrls: parseJsonArray(row.image_urls).map(text).filter(Boolean),
    governmentIdUrls: parseJsonArray(row.government_id_urls).map(text).filter(Boolean),
    submittedAt: row.submitted_at ? String(row.submitted_at) : null,
    reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
    reviewNote: text(row.review_note),
  };
}

/**
 * Sends school email verification requests for unverified education entries.
 *
 * @param application - Persisted proctor application with education property, which is an array of education objects, 
 * for example an application whose first education object includes `{ school: "SFSU", schoolEmail: "student@sfsu.edu" }`.
 *
 * @returns The application with updated education verification metadata, for example
 * `{ schoolEmailVerificationStatus: "pending", schoolEmailVerificationSentAt: "2026-06-19T12:00:00.000Z" }`.
 */
async function sendSchoolEmailVerifications(application: ReturnType<typeof mapApplication>) {
  // `mapApplication()` returns education objects without token fields; those fields are optional and only needed while
  // preparing a verification email. Clone each object before adding them so the incoming mapped application stays
  // unchanged until the database update succeeds. Example mapped shape:
  // [{ school: "SFSU", schoolEmail: "student@sfsu.edu", schoolEmailVerificationStatus: "pending" }]
  // Example cloned working shape after token assignment:
  // [{ school: "SFSU", schoolEmail: "student@sfsu.edu", schoolEmailVerificationStatus: "pending",
  //    schoolEmailVerificationToken: "<hashed token>", schoolEmailVerificationExpiresAt: "2026-06-19T12:00:00.000Z" }]

  // make a shallow copy of the education array and each education object so we can add verification fields without mutating the input

  const educationWithTokens: ProctorApplicationEducation[] = application.education.map((education) => ({ ...education }));

  const applicantName = application.applicantName || application.applicantEmail;
  const sendJobs: Array<Promise<void>> = [];

  educationWithTokens.forEach((education, index) =>{
    const schoolEmail = text(education.schoolEmail).toLowerCase();
    // Skip entries that cannot or should not receive a new email: no school email exists, the email is already
    // verified, or a verification email was already sent. Example: `{ schoolEmailVerificationSentAt:
    // "2026-06-19T12:00:00.000Z" }` keeps the existing pending token instead of sending a duplicate.
    if (!schoolEmail || education.schoolEmailVerificationStatus === "verified" || education.schoolEmailVerificationSentAt) return;

    const { rawToken, hashedToken, expiresAt } = createSchoolEmailVerificationToken();
    
    education.schoolEmail = schoolEmail;
    education.schoolEmailVerificationStatus = "pending";
    education.schoolEmailVerificationToken = hashedToken;
    education.schoolEmailVerificationExpiresAt = expiresAt.toISOString();
    education.schoolEmailVerificationSentAt = new Date().toISOString();

    sendJobs.push(sendSchoolEmailVerificationEmail({
      to: schoolEmail,
      applicantName,
      school: education.school,
      verificationLink: buildSchoolEmailVerificationLink({
        applicationId: application.id,
        educationIndex: index,
        email: schoolEmail,
        rawToken,
      }),
    }));
  });

  if (sendJobs.length === 0) return application;

  await pool.query(
    "UPDATE proctor_applications SET education = $2::jsonb, updated_at = NOW() WHERE id = $1",
    [application.id, JSON.stringify(educationWithTokens)]
  );

  try {
    await Promise.all(sendJobs);
  } catch (error) {
    console.error("school email verification error:", error);
  }

  return {
    ...application,
    education: educationWithTokens.map((education) => ({
      degree: education.degree,
      school: education.school,
      major: education.major,
      startMonth: education.startMonth,
      endMonth: education.endMonth,
      diplomaUrl: education.diplomaUrl,
      schoolEmail: education.schoolEmail,
      educationVerificationAuthorized: education.educationVerificationAuthorized,
      schoolEmailVerificationStatus: education.schoolEmailVerificationStatus,
      schoolEmailVerificationSentAt: education.schoolEmailVerificationSentAt,
      schoolEmailVerifiedAt: education.schoolEmailVerifiedAt,
    })),
  };
}

/**
 * Gets the school email verification state for one education entry owned by a user.
 *
 * @param userId - Authenticated applicant user id, for example `42`.
 * @param educationIndex - Education entry index in the application JSON, for example `0`.
 * @param schoolEmail - School email address expected for that entry, for example `student@school.edu`.
 *
 * @returns The current verification status for that school email.
 */
export async function getSchoolEmailVerificationStatusForUser(userId: number, educationIndex: number, schoolEmail: string) {
  const normalizedEmail = text(schoolEmail).toLowerCase();
  if (!normalizedEmail || educationIndex < 0) return { status: "not_provided" as const };

  const result = await pool.query<{ education: unknown }>(
    "SELECT education FROM proctor_applications WHERE user_id = $1 LIMIT 1",
    [userId]
  );
  const education = parseJsonArray(result.rows[0]?.education).map((item) =>
    typeof item === "object" && item !== null ? item as ProctorApplicationEducation : null
  );
  const target = education[educationIndex];
  if (!target || text(target.schoolEmail).toLowerCase() !== normalizedEmail) {
    return { status: "not_provided" as const };
  }

  return {
    status: target.schoolEmailVerificationStatus === "verified" || target.schoolEmailVerificationStatus === "pending"
      ? target.schoolEmailVerificationStatus
      : "not_provided",
    sentAt: target.schoolEmailVerificationSentAt || "",
    verifiedAt: target.schoolEmailVerifiedAt || "",
  };
}

/**
 * Sends a school email verification link for one education entry owned by a user.
 *
 * @param userId - Authenticated applicant user id, for example `42`.
 * @param educationIndex - Education entry index in the application JSON, for example `0`.
 * @param schoolEmail - School email address to verify, for example `student@school.edu`.
 *
 * @returns The pending verification state after the email is queued.
 */
export async function sendSchoolEmailVerificationForUser({
  userId,
  educationIndex,
  schoolEmail,
}: {
  userId: number;
  educationIndex: number;
  schoolEmail: string;
}) {
  const normalizedEmail = text(schoolEmail).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error("A valid school email is required.");
  }
  if (educationIndex < 0) throw new Error("A valid education entry is required.");

  const { rawToken, hashedToken, expiresAt } = createSchoolEmailVerificationToken();
  const sentAt = new Date().toISOString();
  let emailPayload: {
    applicationId: number;
    applicantName: string;
    school: string;
    verificationLink: string;
  } | null = null;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<ApplicationRow>(
      `
        SELECT pa.*, u.email, u.first_name, u.last_name, u.date_of_birth, tz.name AS timezone_name, e.name AS ethnicity_name
        FROM proctor_applications pa
        JOIN users u ON u.id = pa.user_id
        LEFT JOIN timezones tz ON tz.id = pa.timezone_id
        LEFT JOIN ethnicities e ON e.id = pa.ethnicity_id
        WHERE pa.user_id = $1
        FOR UPDATE OF pa
      `,
      [userId]
    );
    const row = result.rows[0];
    if (!row) throw new Error("Save this application section before sending school email verification.");

    const application = mapApplication(row);
    const education = parseJsonArray(row.education).map((item) =>
      typeof item === "object" && item !== null ? { ...(item as ProctorApplicationEducation) } : {} as ProctorApplicationEducation
    );
    const target = education[educationIndex];
    if (!target) throw new Error("A valid education entry is required.");
    if (text(target.schoolEmail).toLowerCase() !== normalizedEmail) {
      throw new Error("Save the school email before sending verification.");
    }
    if (target.schoolEmailVerificationStatus === "verified") {
      await client.query("COMMIT");
      return {
        status: "verified" as const,
        sentAt: target.schoolEmailVerificationSentAt || "",
        verifiedAt: target.schoolEmailVerifiedAt || "",
      };
    }

    target.schoolEmail = normalizedEmail;
    target.schoolEmailVerificationStatus = "pending";
    target.schoolEmailVerificationToken = hashedToken;
    target.schoolEmailVerificationExpiresAt = expiresAt.toISOString();
    target.schoolEmailVerificationSentAt = sentAt;
    target.schoolEmailVerifiedAt = "";

    await client.query(
      "UPDATE proctor_applications SET education = $2::jsonb, updated_at = NOW() WHERE id = $1",
      [application.id, JSON.stringify(education)]
    );
    await client.query("COMMIT");

    emailPayload = {
      applicationId: application.id,
      applicantName: application.applicantName || application.applicantEmail,
      school: target.school,
      verificationLink: buildSchoolEmailVerificationLink({
        applicationId: application.id,
        educationIndex,
        email: normalizedEmail,
        rawToken,
      }),
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  await sendSchoolEmailVerificationEmail({
    to: normalizedEmail,
    applicantName: emailPayload?.applicantName || "",
    school: emailPayload?.school || "",
    verificationLink: emailPayload?.verificationLink || "",
  });

  return { status: "pending" as const, sentAt };
}

/**
 * Normalizes proctor application input into the shape this flow expects.
 *
 * Example: `{ state: "ca", country: "", education: [{ degree: "BS", school: "UCLA", major: "Math", schoolEmail: "Student@UCLA.edu" }] }`
 * becomes `{ state: "CA", country: "United States", education: [{ degree: "BS", school: "UCLA", major: "Math", schoolEmail: "student@ucla.edu", schoolEmailVerificationStatus: "pending" }] }`.
 *
 * @param payload - Input used by normalize proctor application input.
 *
 * @returns The normalized value.
 */
export function normalizeProctorApplicationInput(payload: unknown): ProctorApplicationInput {
  const data = typeof payload === "object" && payload !== null ? payload as Record<string, unknown> : {};
  const education = parseJsonArray(data.education)
    .map((item) => (typeof item === "object" && item !== null ? item as Record<string, unknown> : null))
    .filter((item): item is Record<string, unknown> => item !== null)
    .map((item) => ({
      degree: text(item.degree),
      school: text(item.school),
      major: text(item.major),
      startMonth: text(item.startMonth),
      endMonth: text(item.endMonth),
      diplomaUrl: singleDiplomaUrl(item),
      schoolEmail: text(item.schoolEmail).toLowerCase(),
      educationVerificationAuthorized: item.educationVerificationAuthorized === true,
      // Keep verified status only when the caller provides it; 
      // otherwise a provided school email must be verified later, so mark it pending.
      // If no school email is provided, the status is not_provided because school email verification is optional.
      // `as const` keeps each string as its exact literal type instead of widening it to plain string.
      // If item.schoolEmailVerificationStatus is "verified", keep it as "verified".
      // Otherwise, if item.schoolEmail exists, mark it "pending".
      // Otherwise, mark it "not_provided".
      schoolEmailVerificationStatus: text(item.schoolEmailVerificationStatus) === "verified"
        ? "verified" as const
        : text(item.schoolEmail).toLowerCase()
          ? "pending" as const
          : "not_provided" as const,
    }))
    .filter((item) => item.degree && item.school && item.major);
  const imageUrls = parseJsonArray(data.imageUrls).map(text).filter(Boolean);
  const hourlyRate = positiveNumber(data.hourlyRate, 0);
  const minimumHours = positiveNumber(data.minimumHours, 1);
  const maximumHours = positiveNumber(data.maximumHours, minimumHours);

  return {
    profession: text(data.profession),
    gender: text(data.gender),
    ethnicity: text(data.ethnicity),
    dateOfBirth: normalizeDate(data.dateOfBirth),
    bio: text(data.bio),
    street: text(data.street),
    city: text(data.city),
    state: text(data.state).toUpperCase(),
    country: text(data.country) || "United States",
    zipCode: text(data.zipCode),
    timezone: text(data.timezone),
    hourlyRate,
    minimumHours,
    maximumHours: Math.max(minimumHours, maximumHours),
    education,
    imageUrls,
    governmentIdUrls: parseJsonArray(data.governmentIdUrls).map(text).filter(Boolean),
  };
}

/**
 * Runs the validate proctor application input logic for this module.
 *
 * @param input - Input used by validate proctor application input.
 *
 * @returns The result used by the surrounding flow.
 */
export function validateProctorApplicationInput(input: ProctorApplicationInput) {
  if (!input.profession) return "Profession is required.";
  if (input.profession === "Other") return "Choose a listed profession.";
  if (!input.gender) return "Gender is required.";
  if (!input.ethnicity) return "Ethnicity is required.";
  if (!input.dateOfBirth) return "Date of birth is required.";
  if (!isAtLeastAge(input.dateOfBirth, 18)) return "You must be at least 18 years old to apply as a proctor.";
  if (!input.bio || input.bio.length < 40) return "Self-introduction must be at least 40 characters.";
  if (!input.street || !input.city || !input.state || !input.country || !input.zipCode) return "Full service address is required.";
  if (!input.timezone) return "IANA timezone is required.";
  if (!Number.isFinite(input.hourlyRate) || input.hourlyRate <= 0) return "Hourly rate must be greater than zero.";
  if (!Number.isInteger(input.hourlyRate)) return "Hourly rate must be a whole dollar amount.";
  if (!Number.isFinite(input.minimumHours) || !Number.isFinite(input.maximumHours) || input.maximumHours < input.minimumHours) return "Session hours are invalid.";
  if (input.education.length === 0) return "At least one education entry is required.";
  if (input.education.some((education) => !education.diplomaUrl)) return "A diploma upload is required for each education entry.";
  if (input.education.some((education) => !education.educationVerificationAuthorized)) return "Check the education verification authorization box for each education entry before continuing.";
  if (input.education.some((education) => education.schoolEmail && education.schoolEmailVerificationStatus !== "verified")) return "Verify each provided school email before submitting.";
  if (input.imageUrls.length === 0) return "At least one profile image URL is required.";
  if (input.governmentIdUrls.length === 0) return "A government-issued ID upload is required.";
  return null;
}

/**
 * Loads the authenticated user's proctor application for the account form.
 *
 * The returned application is already normalized for the browser: JSON columns such as
 * `education`, `image_urls`, and `government_id_urls` are parsed into arrays, lookup ids are
 * converted into display names, and missing rows return `null`.
 *
 * @param userId - Authenticated applicant user id, for example `42`.
 *
 * @returns The user's application, for example `{ status: "draft", education: [{ degree: "Bachelor's Degree", diplomaUrl: "gcs://bucket/path/diploma.pdf" }] }`, or `null` when no application exists.
 */
export async function getProctorApplicationForUser(userId: number) {
  // Join lookup tables here so the client receives display values like timezone name instead of internal ids.
  const result = await pool.query<ApplicationRow>(
    `
      SELECT pa.*, u.email, u.first_name, u.last_name, tz.name AS timezone_name, e.name AS ethnicity_name
           , u.date_of_birth
      FROM proctor_applications pa
      JOIN users u ON u.id = pa.user_id
      LEFT JOIN timezones tz ON tz.id = pa.timezone_id
      LEFT JOIN ethnicities e ON e.id = pa.ethnicity_id
      WHERE pa.user_id = $1
      LIMIT 1
    `,
    [userId]
  );
  
  const application = result.rows[0] ? mapApplication(result.rows[0]) : null;
  // Pending applications trigger any missing school-email verification sends before the browser receives the latest status.
  if (application?.status === "pending") {
    return sendSchoolEmailVerifications(application);
  }
  return application;
}

/**
 * Gets user date of birth for this flow.
 *
 * @param userId - Input used by get user date of birth.
 *
 * @returns The result used by the surrounding flow.
 */
export async function getUserDateOfBirth(userId: number) {
  const result = await pool.query<{ date_of_birth: unknown }>(
    "SELECT date_of_birth FROM users WHERE id = $1 LIMIT 1",
    [userId]
  );
  const value = result.rows[0]?.date_of_birth;
  return value instanceof Date ? value.toISOString().slice(0, 10) : normalizeDate(value);
}

/**
 * Runs the user has proctor application logic for this module.
 *
 * @param userId - Input used by user has proctor application.
 *
 * @returns The result used by the surrounding flow.
 */
export async function userHasProctorApplication(userId: number) {
  const result = await pool.query<{ exists: boolean }>(
    "SELECT EXISTS (SELECT 1 FROM proctor_applications WHERE user_id = $1) AS exists",
    [userId]
  );
  return result.rows[0]?.exists === true;
}

/**
 * Checks whether an existing proctor application status blocks applicant edits.
 *
 * @param status - Persisted application status, for example `pending`.
 * @returns True for `pending` and `approved`; false for `draft`, `rejected`, or missing status.
 */
function proctorApplicationStatusBlocksApplicantEdits(status: unknown) {
  return status === "pending" || status === "approved";
}

/**
 * Rejects applicant edits when an existing proctor application is already pending or approved.
 *
 * @param userId - Applicant user id, for example `206`.
 * @returns Nothing when no blocking application exists.
 */
async function assertProctorApplicationEditableForApplicant(userId: number) {
  const result = await pool.query<{ status: unknown }>(
    "SELECT status FROM proctor_applications WHERE user_id = $1 LIMIT 1",
    [userId]
  );
  const status = result.rows[0]?.status;
  // Pending applications are waiting for admin review, and approved applications are already live.
  // Example: status `rejected` can be edited and resubmitted, but status `pending` cannot.
  if (proctorApplicationStatusBlocksApplicantEdits(status)) {
    throw new Error(LOCKED_PROCTOR_APPLICATION_MESSAGE);
  }
}

/**
 * Saves a proctor application submission when the applicant is allowed to edit it.
 *
 * @param userId - Applicant user id, for example `206`.
 * @param input - Validated proctor application values, for example `status` will become `pending` after this save.
 *
 * @returns The submitted application with status `pending`.
 */
export async function saveProctorApplication(userId: number, input: ProctorApplicationInput) {
  await assertProctorApplicationEditableForApplicant(userId);
  const result = await pool.query<ApplicationRow>(
    // why do we need the ON CONFLICT clause?
    // used to handle the case where a draft is already saved and needs to be updated.
    // User was rejected, then he edit and resubmits.
    // the following query looks a lot like the one in saveProctorApplicationDraft, but they are different.
    // if we try to convalesce the two queries, the query becomes more complex and harder to understand.
    // gpt can tell you the differences between the two queries.
    `
      WITH saved_application AS (
        INSERT INTO proctor_applications (
          user_id, status, profession, gender, bio, street, city, state, country, zip_code,
          hourly_rate, minimum_hours, maximum_hours, education, image_urls, timezone_id, ethnicity_id, government_id_urls, submitted_at, updated_at,
          reviewed_by, reviewed_at, review_note
        )
        VALUES ($1, 'pending', $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, $15::jsonb, (SELECT id FROM timezones WHERE name = $16 LIMIT 1), (SELECT id FROM ethnicities WHERE name = $17 LIMIT 1), $18::jsonb, NOW(), NOW(), NULL, NULL, NULL)
        ON CONFLICT (user_id)
        DO UPDATE SET
          status = 'pending',
          profession = EXCLUDED.profession,
          gender = EXCLUDED.gender,
          bio = EXCLUDED.bio,
          street = EXCLUDED.street,
          city = EXCLUDED.city,
          state = EXCLUDED.state,
          country = EXCLUDED.country,
          zip_code = EXCLUDED.zip_code,
          hourly_rate = EXCLUDED.hourly_rate,
          minimum_hours = EXCLUDED.minimum_hours,
          maximum_hours = EXCLUDED.maximum_hours,
          education = EXCLUDED.education,
          image_urls = EXCLUDED.image_urls,
          timezone_id = EXCLUDED.timezone_id,
          ethnicity_id = EXCLUDED.ethnicity_id,
          government_id_urls = EXCLUDED.government_id_urls,
          submitted_at = NOW(),
          updated_at = NOW(),
          reviewed_by = NULL,
          reviewed_at = NULL,
          review_note = NULL
        WHERE proctor_applications.status NOT IN ('pending', 'approved')
        RETURNING *
      ),
      updated_user AS (
        UPDATE users
        SET date_of_birth = $2::date
        WHERE id = $1
          -- Only update DOB when the application upsert returned a row; 
          -- if the upsert didn't return a row, it means the application was already submitted or approved;
          -- so we don't want to update the user's DOB in that case;
          AND EXISTS (SELECT 1 FROM saved_application)
        RETURNING id, email, first_name, last_name, date_of_birth
      )
      SELECT saved_application.*, updated_user.email, updated_user.first_name, updated_user.last_name, updated_user.date_of_birth, tz.name AS timezone_name, e.name AS ethnicity_name
      FROM saved_application
      JOIN updated_user
        ON updated_user.id = saved_application.user_id
      LEFT JOIN timezones tz
        ON tz.id = saved_application.timezone_id
      LEFT JOIN ethnicities e
        ON e.id = saved_application.ethnicity_id
    `,
    [
      userId,
      input.dateOfBirth,
      input.profession,
      input.gender,
      input.bio,
      input.street,
      input.city,
      input.state,
      input.country,
      input.zipCode,
      input.hourlyRate,
      input.minimumHours,
      input.maximumHours,
      JSON.stringify(input.education),
      JSON.stringify(input.imageUrls),
      input.timezone,
      input.ethnicity,
      JSON.stringify(input.governmentIdUrls),
    ]
  );
  const row = result.rows[0];
  // The conditional upsert can return no row when a concurrent request changed the application to pending/approved.
  // Example: two POSTs race; the first stores `pending`, and the second reaches this branch instead of overwriting it.
  if (!row) {
    throw new Error(LOCKED_PROCTOR_APPLICATION_MESSAGE);
  }
  return sendSchoolEmailVerifications(mapApplication(row));
}

/**
 * Saves a proctor application draft when the applicant is allowed to edit it.
 * eg: the application is not submitted or approved.
 *
 * @param userId - Applicant user id, for example `206`.
 * @param input - Draft proctor application values, for example a partially completed education list.
 *
 * @returns The saved draft application.
 */
export async function saveProctorApplicationDraft(userId: number, input: ProctorApplicationInput) {
  // If assertProctorApplicationEditableForApplicant(userId) throws, execution stops here.
  // The thrown error bubbles back to the route handler.
  // The route catches it in POST or PATCH.
  await assertProctorApplicationEditableForApplicant(userId);
  // if no error is thrown, continue with the rest of the function
  const result = await pool.query<ApplicationRow>(
    `
      WITH saved_application AS (
        INSERT INTO proctor_applications (
          user_id, status, profession, gender, bio, street, city, state, country, zip_code,
          hourly_rate, minimum_hours, maximum_hours, education, image_urls, timezone_id, ethnicity_id, government_id_urls, submitted_at, updated_at,
          reviewed_by, reviewed_at, review_note
        )
        VALUES (
          $1,
          'draft',
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10,
          $11,
          $12,
          $13,
          $14::jsonb,
          $15::jsonb,
          (SELECT id FROM timezones WHERE name = $16 LIMIT 1),
          (SELECT id FROM ethnicities WHERE name = $17 LIMIT 1),
          $18::jsonb,
          NOW(),
          NOW(),
          NULL,
          NULL,
          NULL
        )
        ON CONFLICT (user_id)
        DO UPDATE SET
          status = 'draft',
          profession = EXCLUDED.profession,
          gender = EXCLUDED.gender,
          bio = EXCLUDED.bio,
          street = EXCLUDED.street,
          city = EXCLUDED.city,
          state = EXCLUDED.state,
          country = EXCLUDED.country,
          zip_code = EXCLUDED.zip_code,
          hourly_rate = EXCLUDED.hourly_rate,
          minimum_hours = EXCLUDED.minimum_hours,
          maximum_hours = EXCLUDED.maximum_hours,
          education = EXCLUDED.education,
          image_urls = EXCLUDED.image_urls,
          timezone_id = EXCLUDED.timezone_id,
          ethnicity_id = EXCLUDED.ethnicity_id,
          government_id_urls = EXCLUDED.government_id_urls,
          updated_at = NOW()
        WHERE proctor_applications.status NOT IN ('pending', 'approved')
        RETURNING *
      ),
      updated_user AS (
        UPDATE users
        SET date_of_birth = COALESCE(NULLIF($2, '')::date, date_of_birth)
        WHERE id = $1
          -- Only update DOB when the draft upsert returned a row; for example, a PATCH racing behind a pending submit leaves users.date_of_birth unchanged.
          AND EXISTS (SELECT 1 FROM saved_application)
        RETURNING id, email, first_name, last_name, date_of_birth
      )
      SELECT saved_application.*, updated_user.email, updated_user.first_name, updated_user.last_name, updated_user.date_of_birth, tz.name AS timezone_name, e.name AS ethnicity_name
      FROM saved_application
      JOIN updated_user
        ON updated_user.id = saved_application.user_id
      LEFT JOIN timezones tz
        ON tz.id = saved_application.timezone_id
      LEFT JOIN ethnicities e
        ON e.id = saved_application.ethnicity_id
    `,
    [
      userId,
      input.dateOfBirth,
      input.profession,
      input.gender,
      input.bio,
      input.street,
      input.city,
      input.state,
      input.country || "United States",
      input.zipCode,
      input.hourlyRate,
      input.minimumHours,
      input.maximumHours,
      JSON.stringify(input.education),
      JSON.stringify(input.imageUrls),
      input.timezone,
      input.ethnicity,
      JSON.stringify(input.governmentIdUrls),
    ]
  );
  const row = result.rows[0];
  // The conditional upsert can return no row when a concurrent submit has already locked the application.
  // Example: a PATCH racing behind a POST sees the row as `pending` and returns 409 instead of saving a stale draft.
  if (!row) {
    throw new Error(LOCKED_PROCTOR_APPLICATION_MESSAGE);
  }
  return mapApplication(row);
}

/**
 * Runs the list proctor applications logic for this module.
 *
 * @returns The result used by the surrounding flow.
 */
export async function listProctorApplications() {
  const result = await pool.query<ApplicationRow>(
    `
      SELECT pa.*, u.email, u.first_name, u.last_name, tz.name AS timezone_name, e.name AS ethnicity_name
           , u.date_of_birth
      FROM proctor_applications pa
      JOIN users u ON u.id = pa.user_id
      LEFT JOIN timezones tz ON tz.id = pa.timezone_id
      LEFT JOIN ethnicities e ON e.id = pa.ethnicity_id
      WHERE pa.status <> 'draft'
      ORDER BY
        CASE pa.status WHEN 'pending' THEN 0 WHEN 'rejected' THEN 1 ELSE 2 END,
        pa.submitted_at DESC
    `
  );
  return result.rows.map(mapApplication);
}

/**
 * Runs the review proctor application logic for this module.
 *
 * @param applicationId - Input used by review proctor application.
 * @param adminUserId - Input used by review proctor application.
 * @param action - Input used by review proctor application.
 * @param note - Input used by review proctor application.
 * @param editedInput - Input used by review proctor application.
 *
 * @returns The result used by the surrounding flow.
 */
export async function reviewProctorApplication(
  applicationId: number,
  adminUserId: number,
  action: "approve" | "reject",
  note = "",
  editedInput?: ProctorApplicationInput | null
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const appResult = await client.query<ApplicationRow>(
      `
        SELECT pa.*, u.date_of_birth, tz.name AS timezone_name, e.name AS ethnicity_name
        FROM proctor_applications pa
        JOIN users u
          ON u.id = pa.user_id
        LEFT JOIN timezones tz
          ON tz.id = pa.timezone_id
        LEFT JOIN ethnicities e
          ON e.id = pa.ethnicity_id
        WHERE pa.id = $1
        FOR UPDATE OF pa
      `,
      [applicationId]
    );
    const row = appResult.rows[0];
    if (!row) throw new Error("Application not found.");
    let application = mapApplication(row);

    if (editedInput) {
      await client.query(
        "UPDATE users SET date_of_birth = $2::date WHERE id = $1",
        [application.userId, editedInput.dateOfBirth]
      );
      const updatedResult = await client.query<ApplicationRow>(
        `
          UPDATE proctor_applications
          SET profession = $2,
              gender = $3,
              bio = $4,
              street = $5,
              city = $6,
              state = $7,
              country = $8,
              zip_code = $9,
              hourly_rate = $10,
              minimum_hours = $11,
              maximum_hours = $12,
              education = $13::jsonb,
              image_urls = $14::jsonb,
              timezone_id = (SELECT id FROM timezones WHERE name = $15 LIMIT 1),
              ethnicity_id = (SELECT id FROM ethnicities WHERE name = $16 LIMIT 1),
              government_id_urls = $17::jsonb,
              updated_at = NOW()
          WHERE id = $1
          RETURNING *, (SELECT name FROM timezones WHERE id = timezone_id) AS timezone_name, (SELECT name FROM ethnicities WHERE id = ethnicity_id) AS ethnicity_name
        `,
        [
          applicationId,
          editedInput.profession,
          editedInput.gender,
          editedInput.bio,
          editedInput.street,
          editedInput.city,
          editedInput.state,
          editedInput.country,
          editedInput.zipCode,
          editedInput.hourlyRate,
          editedInput.minimumHours,
          editedInput.maximumHours,
          JSON.stringify(editedInput.education),
          JSON.stringify(editedInput.imageUrls),
          editedInput.timezone,
          editedInput.ethnicity,
          JSON.stringify(editedInput.governmentIdUrls),
        ]
      );
      application = {
        ...mapApplication(updatedResult.rows[0]),
        dateOfBirth: editedInput.dateOfBirth,
        applicantName: application.applicantName,
        applicantEmail: application.applicantEmail,
      };
    }

    if (action === "reject") {
      await client.query(
        "UPDATE proctor_applications SET status = 'rejected', reviewed_by = $2, reviewed_at = NOW(), review_note = $3, updated_at = NOW() WHERE id = $1",
        [applicationId, adminUserId, note]
      );
      await client.query("COMMIT");
      return { status: "rejected" as const };
    }

    const professionId = await getExistingNamedId(client, "professions", application.profession);
    const genderId = await getExistingNamedId(client, "genders", application.gender);
    const ethnicityId = await getExistingNamedId(client, "ethnicities", application.ethnicity);
    if (!professionId) throw new Error("Selected profession is not configured.");
    if (!genderId) throw new Error("Selected gender is not configured.");
    if (!ethnicityId) throw new Error("Selected ethnicity is not configured.");
    const { countryId, stateId, cityId } = await upsertSubmittedLocationIds(client, application);
    await cacheSubmittedLocationTimeZone(client, { countryId, stateId, cityId }, application.timezone);
    const addressResult = await client.query<{ id: unknown }>(
      `
        INSERT INTO addresses (street, zip_code, country_id, state_id, city_id)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `,
      [application.street, application.zipCode, countryId, stateId, cityId]
    );
    const addressId = toNumber(addressResult.rows[0].id);

    await client.query(
      `
        UPDATE users
        SET profession_id = $2,
            gender_id = $3,
            proctor_address_id = $4,
            hourly_rate = $5,
            minimum_hours = $6,
            maximum_hours = $7,
            timezone_id = (SELECT id FROM timezones WHERE name = $8 LIMIT 1),
            ethnicity_id = $9
        WHERE id = $1
      `,
      [application.userId, professionId, genderId, addressId, application.hourlyRate, application.minimumHours, application.maximumHours, application.timezone, ethnicityId]
    );

    await client.query("DELETE FROM user_education WHERE user_id = $1", [application.userId]);
    for (const [index, education] of (application.education as ProctorApplicationEducation[]).entries()) {
      const degreeId = await getExistingDegreeId(client, education.degree);
      if (!degreeId) throw new Error(`Unknown degree: ${education.degree}.`);
      const schoolId = await upsertNamed(client, "schools", education.school);
      const majorId = await upsertNamed(client, "majors", education.major);
      const educationResult = await client.query<{ id: unknown }>(
        `
          INSERT INTO educations (school_id, degree_id, major_id, start_month, end_month)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id
        `,
        [schoolId, degreeId, majorId, normalizeMonth(education.startMonth), normalizeMonth(education.endMonth)]
      );
      await client.query(
        `
          INSERT INTO user_education (
            user_id,
            education_id,
            is_primary,
            school_email,
            school_email_verification_status,
            school_email_verified_at,
            school_email_verification_sent_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          application.userId,
          toNumber(educationResult.rows[0].id),
          index === 0,
          education.schoolEmail || null,
          education.schoolEmail ? education.schoolEmailVerificationStatus : "not_provided",
          education.schoolEmailVerificationStatus === "verified" ? new Date() : null,
          education.schoolEmail ? new Date() : null,
        ]
      );
    }

    await client.query("DELETE FROM user_image WHERE user_id = $1", [application.userId]);
    for (const [index, imageUrl] of application.imageUrls.entries()) {
      const imageResult = await client.query<{ id: unknown }>(
        `
          INSERT INTO images (url, alt_text)
          VALUES ($1, $2)
          ON CONFLICT (url) DO UPDATE SET alt_text = EXCLUDED.alt_text, updated_at = NOW()
          RETURNING id
        `,
        [imageUrl, `${application.applicantName || "Proctor"} profile image`]
      );
      await client.query(
        "INSERT INTO user_image (user_id, image_id, is_primary, sort_order) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING",
        [application.userId, toNumber(imageResult.rows[0].id), index === 0, index]
      );
    }

    const roleResult = await client.query<{ id: unknown }>("SELECT id FROM roles WHERE name = 'proctor' LIMIT 1");
    if (!roleResult.rows[0]) throw new Error("Missing proctor role.");
    await client.query(
      "INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [application.userId, toNumber(roleResult.rows[0].id)]
    );
    await client.query(
      "UPDATE proctor_applications SET status = 'approved', reviewed_by = $2, reviewed_at = NOW(), review_note = $3, updated_at = NOW() WHERE id = $1",
      [applicationId, adminUserId, note]
    );

    await client.query("COMMIT");
    return { status: "approved" as const };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
