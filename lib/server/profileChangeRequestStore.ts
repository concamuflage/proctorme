import pool from "@/lib/server/database/pool";
import { getCachedOrResolvedCityTimeZone } from "@/lib/server/proctorStore";

export type ProfileChangeRequestStatus = "pending" | "approved" | "rejected";
export type ProfileChangeType = "address" | "education";

export type ProfileChangeRequest = {
  id: number;
  userId: number;
  applicantName: string;
  applicantEmail: string;
  changeType: ProfileChangeType;
  status: ProfileChangeRequestStatus;
  oldValues: Record<string, unknown>;
  newValues: Record<string, unknown>;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewNote: string;
};

type ChangeRequestRow = {
  id: unknown;
  user_id: unknown;
  first_name?: unknown;
  last_name?: unknown;
  email?: unknown;
  change_type: unknown;
  status: unknown;
  old_values: unknown;
  new_values: unknown;
  submitted_at: unknown;
  reviewed_at: unknown;
  review_note: unknown;
};

type AddressValues = {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
};

type EducationValues = {
  degree: string;
  school: string;
  major: string;
  startMonth: string;
  endMonth: string;
  diplomaUrls: string[];
  schoolEmail: string;
  educationVerificationAuthorized: boolean;
  schoolEmailVerificationStatus: string;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value);
}

function jsonObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function jsonArray(value: unknown): unknown[] {
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
  return jsonArray(value).map(text).filter(Boolean);
}

function normalizeAddressValues(value: Record<string, unknown>): AddressValues {
  return {
    street: text(value.street),
    city: text(value.city),
    state: text(value.state).toUpperCase(),
    zipCode: text(value.zipCode),
    country: text(value.country) || "United States",
  };
}

function normalizeMonth(value: string) {
  const trimmed = value.trim();
  return /^\d{4}-\d{2}$/.test(trimmed) ? `${trimmed}-01` : null;
}

function normalizeEducationValues(value: unknown): EducationValues[] {
  const data = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return jsonArray(data.education)
    .map((item) => (item && typeof item === "object" && !Array.isArray(item) ? item as Record<string, unknown> : null))
    .filter((item): item is Record<string, unknown> => item !== null)
    .map((item) => ({
      degree: text(item.degree),
      school: text(item.school),
      major: text(item.major),
      startMonth: text(item.startMonth),
      endMonth: text(item.endMonth),
      diplomaUrls: textArray(item.diplomaUrls),
      schoolEmail: text(item.schoolEmail).toLowerCase(),
      educationVerificationAuthorized: item.educationVerificationAuthorized === true,
      schoolEmailVerificationStatus: text(item.schoolEmailVerificationStatus) === "verified"
        ? "verified"
        : text(item.schoolEmail)
          ? "pending"
          : "not_provided",
    }));
}

function mapRequest(row: ChangeRequestRow): ProfileChangeRequest {
  const firstName = text(row.first_name);
  const lastName = text(row.last_name);
  return {
    id: toNumber(row.id),
    userId: toNumber(row.user_id),
    applicantName: [firstName, lastName].filter(Boolean).join(" "),
    applicantEmail: text(row.email),
    changeType: text(row.change_type) as ProfileChangeType,
    status: text(row.status) as ProfileChangeRequestStatus,
    oldValues: jsonObject(row.old_values),
    newValues: jsonObject(row.new_values),
    submittedAt: row.submitted_at ? String(row.submitted_at) : null,
    reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
    reviewNote: text(row.review_note),
  };
}

export async function getCurrentProctorAddress(userId: number): Promise<AddressValues> {
  const result = await pool.query(
    `
      SELECT
        a.street,
        ci.name AS city,
        s.code AS state,
        a.zip_code,
        COALESCE(co.name, co.country, 'United States') AS country
      FROM users u
      LEFT JOIN addresses a
        ON a.id = u.proctor_address_id
      LEFT JOIN cities ci
        ON ci.id = a.city_id
      LEFT JOIN states s
        ON s.id = a.state_id
      LEFT JOIN countries co
        ON co.id = COALESCE(a.country_id, s.country_id)
      WHERE u.id = $1
      LIMIT 1
    `,
    [userId]
  );
  const row = result.rows[0] ?? {};
  return {
    street: text(row.street),
    city: text(row.city),
    state: text(row.state),
    zipCode: text(row.zip_code),
    country: text(row.country) || "United States",
  };
}

export async function getCurrentProctorEducations(userId: number): Promise<EducationValues[]> {
  const result = await pool.query<{
    degree: unknown;
    school: unknown;
    major: unknown;
    start_month: unknown;
    end_month: unknown;
  }>(
    `
      SELECT d.name AS degree, sc.name AS school, m.name AS major, e.start_month, e.end_month
      FROM user_education ue
      JOIN educations e ON e.id = ue.education_id
      JOIN degrees d ON d.id = e.degree_id
      JOIN schools sc ON sc.id = e.school_id
      JOIN majors m ON m.id = e.major_id
      WHERE ue.user_id = $1
      ORDER BY ue.is_primary DESC, e.start_month DESC NULLS LAST, e.id DESC
    `,
    [userId]
  );

  return result.rows.map((row: {
    degree: unknown;
    school: unknown;
    major: unknown;
    start_month: unknown;
    end_month: unknown;
  }) => ({
    degree: text(row.degree),
    school: text(row.school),
    major: text(row.major),
    startMonth: row.start_month instanceof Date ? row.start_month.toISOString().slice(0, 7) : text(row.start_month).slice(0, 7),
    endMonth: row.end_month instanceof Date ? row.end_month.toISOString().slice(0, 7) : text(row.end_month).slice(0, 7),
    diplomaUrls: [],
    schoolEmail: "",
    educationVerificationAuthorized: true,
    schoolEmailVerificationStatus: "not_provided",
  }));
}

export async function submitProfileChangeRequest(userId: number, changeType: ProfileChangeType, newValues: Record<string, unknown>) {
  const oldValues = changeType === "address"
    ? await getCurrentProctorAddress(userId)
    : changeType === "education"
      ? { education: await getCurrentProctorEducations(userId) }
      : {};

  const result = await pool.query<ChangeRequestRow>(
    `
      INSERT INTO profile_change_requests (
        user_id,
        change_type,
        status,
        old_values,
        new_values,
        submitted_at,
        reviewed_by,
        reviewed_at,
        review_note,
        updated_at
      )
      VALUES ($1, $2, 'pending', $3::jsonb, $4::jsonb, NOW(), NULL, NULL, '', NOW())
      RETURNING *
    `,
    [userId, changeType, JSON.stringify(oldValues), JSON.stringify(newValues)]
  );

  return mapRequest(result.rows[0]);
}

export async function listProfileChangeRequests() {
  const result = await pool.query<ChangeRequestRow>(
    `
      SELECT pcr.*, u.email, u.first_name, u.last_name
      FROM profile_change_requests pcr
      JOIN users u
        ON u.id = pcr.user_id
      ORDER BY
        CASE pcr.status WHEN 'pending' THEN 0 WHEN 'rejected' THEN 1 ELSE 2 END,
        pcr.submitted_at DESC
    `
  );

  return result.rows.map(mapRequest);
}

export async function listProfileChangeRequestsForUser(userId: number) {
  const result = await pool.query<ChangeRequestRow>(
    `
      SELECT pcr.*, u.email, u.first_name, u.last_name
      FROM profile_change_requests pcr
      JOIN users u
        ON u.id = pcr.user_id
      WHERE pcr.user_id = $1
      ORDER BY pcr.submitted_at DESC
    `,
    [userId]
  );

  return result.rows.map(mapRequest);
}

async function upsertAddress(client: typeof pool, address: AddressValues) {
  const countryResult = await client.query<{ id: unknown }>(
    "SELECT id FROM countries WHERE country = 'United States' LIMIT 1"
  );
  const countryId = countryResult.rows[0]?.id == null ? null : toNumber(countryResult.rows[0].id);
  if (!countryId) throw new Error("United States is not configured.");

  const stateResult = await client.query<{ id: unknown }>(
    "SELECT id FROM states WHERE country_id = $1 AND code = $2 LIMIT 1",
    [countryId, address.state]
  );
  const stateId = stateResult.rows[0]?.id == null ? null : toNumber(stateResult.rows[0].id);
  if (!stateId) throw new Error("Selected state is not configured.");

  const cityResult = await client.query<{ id: unknown }>(
    `
      INSERT INTO cities (state_id, name)
      VALUES ($1, $2)
      ON CONFLICT (state_id, name) DO UPDATE
        SET name = EXCLUDED.name
      RETURNING id
    `,
    [stateId, address.city]
  );
  const cityId = toNumber(cityResult.rows[0]?.id);
  if (!Number.isInteger(cityId)) throw new Error("Unable to save city.");

  const addressResult = await client.query<{ id: unknown }>(
    `
      INSERT INTO addresses (street, zip_code, country_id, state_id, city_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `,
    [address.street, address.zipCode, countryId, stateId, cityId]
  );
  const addressId = toNumber(addressResult.rows[0]?.id);
  if (!Number.isInteger(addressId)) throw new Error("Unable to save address.");
  return addressId;
}

async function timezoneIdForAddress(address: AddressValues) {
  const timezoneName = await getCachedOrResolvedCityTimeZone(address.city, address.state, address.country);
  if (!timezoneName) return null;

  const timezoneResult = await pool.query<{ id: unknown }>(
    `
      INSERT INTO timezones (name)
      VALUES ($1)
      ON CONFLICT (name) DO UPDATE
        SET name = EXCLUDED.name
      RETURNING id
    `,
    [timezoneName]
  );
  const timezoneId = timezoneResult.rows[0]?.id == null ? null : toNumber(timezoneResult.rows[0].id);
  return Number.isInteger(timezoneId) ? timezoneId : null;
}

async function getExistingDegreeId(client: typeof pool, name: string) {
  const result = await client.query<{ id: unknown }>("SELECT id FROM degrees WHERE name = $1 LIMIT 1", [name]);
  return result.rows[0]?.id == null ? null : toNumber(result.rows[0].id);
}

async function upsertNamed(client: typeof pool, table: "schools" | "majors", name: string) {
  const result = await client.query<{ id: unknown }>(
    `INSERT INTO ${table} (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
    [name]
  );
  return toNumber(result.rows[0].id);
}

async function applyEducationRequest(client: typeof pool, userId: number, values: Record<string, unknown>) {
  const educations = normalizeEducationValues(values);
  if (educations.length === 0) throw new Error("Education request is incomplete.");

  for (const education of educations) {
    if (!education.degree || !education.school || !education.major) throw new Error("Education request is incomplete.");
    if (education.diplomaUrls.length === 0) throw new Error("Diploma upload is required.");
    if (!education.educationVerificationAuthorized) throw new Error("Education verification authorization is required.");

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
        VALUES ($1, $2, false, $3, $4, $5, $6)
      `,
      [
        userId,
        toNumber(educationResult.rows[0].id),
        education.schoolEmail || null,
        education.schoolEmail ? education.schoolEmailVerificationStatus : "not_provided",
        education.schoolEmailVerificationStatus === "verified" ? new Date() : null,
        education.schoolEmail ? new Date() : null,
      ]
    );
  }
}

export async function reviewProfileChangeRequest(requestId: number, adminUserId: number, action: "approve" | "reject", note = "") {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const requestResult = await client.query<ChangeRequestRow>(
      `
        SELECT *
        FROM profile_change_requests
        WHERE id = $1
        FOR UPDATE
      `,
      [requestId]
    );
    const request = requestResult.rows[0] ? mapRequest(requestResult.rows[0]) : null;
    if (!request) throw new Error("Profile change request not found.");

    if (action === "reject") {
      await client.query(
        "UPDATE profile_change_requests SET status = 'rejected', reviewed_by = $2, reviewed_at = NOW(), review_note = $3, updated_at = NOW() WHERE id = $1",
        [requestId, adminUserId, note]
      );
      await client.query("COMMIT");
      return { status: "rejected" as const };
    }

    if (request.changeType !== "address" && request.changeType !== "education") {
      throw new Error("Unsupported profile change type.");
    }

    if (request.changeType === "address") {
      const address = normalizeAddressValues(request.newValues);
      if (!address.street || !address.city || !address.state || !address.zipCode) {
        throw new Error("Address change request is incomplete.");
      }

      const addressId = await upsertAddress(client, address);
      const timezoneId = await timezoneIdForAddress(address);
      await client.query(
        "UPDATE users SET proctor_address_id = $2, timezone_id = COALESCE($3, timezone_id) WHERE id = $1",
        [request.userId, addressId, timezoneId]
      );
    } else {
      await applyEducationRequest(client, request.userId, request.newValues);
    }

    await client.query(
      "UPDATE profile_change_requests SET status = 'approved', reviewed_by = $2, reviewed_at = NOW(), review_note = $3, updated_at = NOW() WHERE id = $1",
      [requestId, adminUserId, note]
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
