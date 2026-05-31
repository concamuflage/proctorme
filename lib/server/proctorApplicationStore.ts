import pool from "@/backend/database/pool";
import {
  buildSchoolEmailVerificationLink,
  createSchoolEmailVerificationToken,
  normalizeVerificationEmail,
  sendSchoolEmailVerificationEmail,
} from "@/lib/server/schoolEmailVerification";

export type ProctorApplicationStatus = "draft" | "pending" | "approved" | "rejected";

export type ProctorApplicationEducation = {
  degree: string;
  school: string;
  major: string;
  startMonth: string;
  endMonth: string;
  diplomaUrls: string[];
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

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value);
}

function positiveNumber(value: unknown, fallback: number) {
  const number = toNumber(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

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

function textArray(value: unknown) {
  return parseJsonArray(value).map(text).filter(Boolean);
}

function normalizeEmail(value: unknown) {
  return text(value).toLowerCase();
}

function normalizeMonth(value: string) {
  const trimmed = value.trim();
  return /^\d{4}-\d{2}$/.test(trimmed) ? `${trimmed}-01` : null;
}

function normalizeDate(value: unknown) {
  const trimmed = text(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : "";
}

function isAtLeastAge(dateOfBirth: string, age: number) {
  const [year, month, day] = dateOfBirth.split("-").map(Number);
  const birthDate = new Date(Date.UTC(year, month - 1, day));
  if (!Number.isFinite(birthDate.getTime())) return false;

  const today = new Date();
  const threshold = new Date(Date.UTC(today.getUTCFullYear() - age, today.getUTCMonth(), today.getUTCDate()));
  return birthDate.getTime() <= threshold.getTime();
}

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

async function getExistingDegreeId(client: typeof pool, name: string) {
  const result = await client.query<{ id: unknown }>(
    "SELECT id FROM degrees WHERE name = $1 LIMIT 1",
    [name]
  );
  return result.rows[0]?.id == null ? null : toNumber(result.rows[0].id);
}

async function upsertNamed(client: typeof pool, table: "professions" | "genders" | "schools" | "majors", name: string) {
  const result = await client.query<{ id: unknown }>(
    `INSERT INTO ${table} (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
    [name]
  );
  return toNumber(result.rows[0].id);
}

async function getExistingNamedId(client: typeof pool, table: "professions" | "genders" | "ethnicities", name: string) {
  const result = await client.query<{ id: unknown }>(
    `SELECT id FROM ${table} WHERE name = $1 LIMIT 1`,
    [name]
  );
  return result.rows[0]?.id == null ? null : toNumber(result.rows[0].id);
}

function mapApplication(row: ApplicationRow) {
  const firstName = text(row.first_name);
  const lastName = text(row.last_name);
  const education = parseJsonArray(row.education)
    .map((item) => (typeof item === "object" && item !== null ? item as Record<string, unknown> : null))
    .filter((item): item is Record<string, unknown> => item !== null)
    .map((item) => ({
      degree: text(item.degree),
      school: text(item.school),
      major: text(item.major),
      startMonth: text(item.startMonth),
      endMonth: text(item.endMonth),
      diplomaUrls: textArray(item.diplomaUrls),
      schoolEmail: normalizeEmail(item.schoolEmail),
      educationVerificationAuthorized: item.educationVerificationAuthorized === true,
      schoolEmailVerificationStatus: text(item.schoolEmailVerificationStatus) === "verified"
        ? "verified" as const
        : normalizeEmail(item.schoolEmail)
          ? "pending" as const
          : "not_provided" as const,
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

async function sendSchoolEmailVerifications(application: ReturnType<typeof mapApplication>) {
  const educationWithTokens: ProctorApplicationEducation[] = application.education.map((education) => ({ ...education }));
  const applicantName = application.applicantName || application.applicantEmail;
  const sendJobs: Array<Promise<void>> = [];

  educationWithTokens.forEach((education, index) => {
    const schoolEmail = normalizeVerificationEmail(education.schoolEmail);
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
      diplomaUrls: education.diplomaUrls,
      schoolEmail: education.schoolEmail,
      educationVerificationAuthorized: education.educationVerificationAuthorized,
      schoolEmailVerificationStatus: education.schoolEmailVerificationStatus,
      schoolEmailVerificationSentAt: education.schoolEmailVerificationSentAt,
      schoolEmailVerifiedAt: education.schoolEmailVerifiedAt,
    })),
  };
}

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
      diplomaUrls: textArray(item.diplomaUrls),
      schoolEmail: normalizeEmail(item.schoolEmail),
      educationVerificationAuthorized: item.educationVerificationAuthorized === true,
      schoolEmailVerificationStatus: text(item.schoolEmailVerificationStatus) === "verified"
        ? "verified" as const
        : normalizeEmail(item.schoolEmail)
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
  if (input.education.some((education) => education.diplomaUrls.length === 0)) return "A diploma upload is required for each education entry.";
  if (input.education.some((education) => !education.educationVerificationAuthorized)) return "Education verification authorization is required for each education entry.";
  if (input.imageUrls.length === 0) return "At least one profile image URL is required.";
  if (input.governmentIdUrls.length === 0) return "A government-issued ID upload is required.";
  return null;
}

export async function getProctorApplicationForUser(userId: number) {
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
  if (application?.status === "pending") {
    return sendSchoolEmailVerifications(application);
  }
  return application;
}

export async function getUserDateOfBirth(userId: number) {
  const result = await pool.query<{ date_of_birth: unknown }>(
    "SELECT date_of_birth FROM users WHERE id = $1 LIMIT 1",
    [userId]
  );
  const value = result.rows[0]?.date_of_birth;
  return value instanceof Date ? value.toISOString().slice(0, 10) : normalizeDate(value);
}

export async function userHasProctorApplication(userId: number) {
  const result = await pool.query<{ exists: boolean }>(
    "SELECT EXISTS (SELECT 1 FROM proctor_applications WHERE user_id = $1) AS exists",
    [userId]
  );
  return result.rows[0]?.exists === true;
}

export async function saveProctorApplication(userId: number, input: ProctorApplicationInput) {
  const result = await pool.query<ApplicationRow>(
    `
      WITH updated_user AS (
        UPDATE users
        SET date_of_birth = $2::date
        WHERE id = $1
        RETURNING id, email, first_name, last_name, date_of_birth
      ),
      saved_application AS (
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
        RETURNING *
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
  return sendSchoolEmailVerifications(mapApplication(result.rows[0]));
}

export async function saveProctorApplicationDraft(userId: number, input: ProctorApplicationInput) {
  const result = await pool.query<ApplicationRow>(
    `
      WITH updated_user AS (
        UPDATE users
        SET date_of_birth = COALESCE(NULLIF($2, '')::date, date_of_birth)
        WHERE id = $1
        RETURNING id, email, first_name, last_name, date_of_birth
      ),
      saved_application AS (
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
          status = CASE WHEN proctor_applications.status = 'pending' THEN proctor_applications.status ELSE 'draft' END,
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
        RETURNING *
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
  return mapApplication(result.rows[0]);
}

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
