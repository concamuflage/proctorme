import pool from "@/lib/server/database/pool";
import { getApprovedOrganizationProfile } from "@/lib/server/organizationApplicationStore";
import { getUserRoles } from "@/lib/server/roleStore";

type ProfileData = {
  user: {
    id: number;
    email: string;
    firstName: string | null;
    lastName: string | null;
    profession: string | null;
    gender: string | null;
    ethnicity: string | null;
    timezone: string | null;
    dateOfBirth: string | null;
    bio: string | null;
    imageUrls: string[];
  };
  educations: Array<{
    degree: string;
    school: string;
    major: string;
    startMonth: string;
    endMonth: string;
    schoolEmail: string;
    schoolEmailVerificationStatus: string;
  }>;
  organizationProfile: Awaited<ReturnType<typeof getApprovedOrganizationProfile>>;
  roles: Array<{
    id: number;
    name: string;
  }>;
};

type EducationRow = {
  degree_name: unknown;
  school_name: unknown;
  major_name: unknown;
  start_month: unknown;
  end_month: unknown;
  school_email: unknown;
  school_email_verification_status: unknown;
};

export type ProfileUpdateInput = {
  profession: string;
  gender: string;
  ethnicity: string;
  timezone: string;
  dateOfBirth: string;
  bio: string;
  imageUrls: string[];
};

function toNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value);
}

function trimText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeDate(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = trimText(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function textArray(value: unknown) {
  return Array.isArray(value) ? value.map(trimText).filter(Boolean) : [];
}

function normalizeProfileUpdateInput(payload: unknown): ProfileUpdateInput {
  const data = typeof payload === "object" && payload !== null ? payload as Record<string, unknown> : {};
  return {
    profession: trimText(data.profession),
    gender: trimText(data.gender),
    ethnicity: trimText(data.ethnicity),
    timezone: trimText(data.timezone),
    dateOfBirth: normalizeDate(data.dateOfBirth),
    bio: trimText(data.bio),
    imageUrls: textArray(data.imageUrls),
  };
}

async function getProfessionId(name: string) {
  if (!name) return null;
  const result = await pool.query<{ id: unknown }>(
    "SELECT id FROM professions WHERE name = $1 AND name <> 'Other' LIMIT 1",
    [name]
  );
  const id = result.rows[0]?.id == null ? null : toNumber(result.rows[0].id);
  return Number.isInteger(id) ? id : null;
}

async function getGenderId(name: string) {
  if (!name) return null;
  const result = await pool.query<{ id: unknown }>(
    "SELECT id FROM genders WHERE name = $1 LIMIT 1",
    [name]
  );
  const id = result.rows[0]?.id == null ? null : toNumber(result.rows[0].id);
  return Number.isInteger(id) ? id : null;
}

async function getEthnicityId(name: string) {
  if (!name) return null;
  const result = await pool.query<{ id: unknown }>(
    "SELECT id FROM ethnicities WHERE name = $1 LIMIT 1",
    [name]
  );
  const id = result.rows[0]?.id == null ? null : toNumber(result.rows[0].id);
  return Number.isInteger(id) ? id : null;
}

async function getTimezoneId(name: string) {
  if (!name) return null;
  const result = await pool.query<{ id: unknown }>(
    "SELECT id FROM timezones WHERE name = $1 LIMIT 1",
    [name]
  );
  const id = result.rows[0]?.id == null ? null : toNumber(result.rows[0].id);
  return Number.isInteger(id) ? id : null;
}

export async function getProfile(userId: number): Promise<ProfileData> {
  const [userResult, educationResult] = await Promise.all([
    pool.query<EducationRow>(
      `
        SELECT u.id, u.email, u.first_name, u.last_name, u.date_of_birth
             , p.name AS profession_name
             , g.name AS gender_name
             , e.name AS ethnicity_name
             , tz.name AS timezone_name
             , pa.bio
             , COALESCE(
                (
                  SELECT array_agg(i.url ORDER BY ui.is_primary DESC, ui.sort_order ASC, i.id ASC)
                  FROM user_image ui
                  JOIN images i
                    ON i.id = ui.image_id
                  WHERE ui.user_id = u.id
                ),
                (
                  SELECT array_agg(image_url)
                  FROM jsonb_array_elements_text(pa.image_urls) AS image_url
                ),
                ARRAY[]::text[]
              ) AS image_urls
        FROM users u
        LEFT JOIN professions p
          ON p.id = u.profession_id
        LEFT JOIN genders g
          ON g.id = u.gender_id
        LEFT JOIN ethnicities e
          ON e.id = u.ethnicity_id
        LEFT JOIN timezones tz
          ON tz.id = u.timezone_id
        LEFT JOIN LATERAL (
          SELECT bio, image_urls
          FROM proctor_applications
          WHERE user_id = u.id
            AND status = 'approved'
          ORDER BY reviewed_at DESC NULLS LAST, updated_at DESC
          LIMIT 1
        ) pa
          ON TRUE
        WHERE u.id = $1
      `,
      [userId]
    ),
    pool.query(
      `
        SELECT d.name AS degree_name,
               sc.name AS school_name,
               m.name AS major_name,
               e.start_month,
               e.end_month,
               ue.school_email,
               ue.school_email_verification_status
        FROM user_education ue
        JOIN educations e
          ON e.id = ue.education_id
        JOIN degrees d
          ON d.id = e.degree_id
        JOIN schools sc
          ON sc.id = e.school_id
        JOIN majors m
          ON m.id = e.major_id
        WHERE ue.user_id = $1
        ORDER BY ue.is_primary DESC, e.start_month DESC NULLS LAST, e.id DESC
      `,
      [userId]
    ),
  ]);

  if (userResult.rows.length === 0) {
    throw new Error("User not found.");
  }

  const user = userResult.rows[0];
  const [roles, organizationProfile] = await Promise.all([
    getUserRoles(userId),
    getApprovedOrganizationProfile(userId),
  ]);

  return {
    user: {
      id: toNumber(user.id),
      email: trimText(user.email),
      firstName: user.first_name ? trimText(user.first_name) : null,
      lastName: user.last_name ? trimText(user.last_name) : null,
      profession: user.profession_name ? trimText(user.profession_name) : null,
      gender: user.gender_name ? trimText(user.gender_name) : null,
      ethnicity: user.ethnicity_name ? trimText(user.ethnicity_name) : null,
      timezone: user.timezone_name ? trimText(user.timezone_name) : null,
      dateOfBirth: user.date_of_birth ? normalizeDate(user.date_of_birth) : null,
      bio: user.bio ? trimText(user.bio) : null,
      imageUrls: textArray(user.image_urls),
    },
    educations: educationResult.rows.map((education: EducationRow) => ({
      degree: trimText(education.degree_name),
      school: trimText(education.school_name),
      major: trimText(education.major_name),
      startMonth: education.start_month instanceof Date ? education.start_month.toISOString().slice(0, 7) : trimText(education.start_month).slice(0, 7),
      endMonth: education.end_month instanceof Date ? education.end_month.toISOString().slice(0, 7) : trimText(education.end_month).slice(0, 7),
      schoolEmail: trimText(education.school_email),
      schoolEmailVerificationStatus: trimText(education.school_email_verification_status) || "not_provided",
    })),
    organizationProfile,
    roles,
  };
}

export function validateProfileUpdateInput(input: ProfileUpdateInput) {
  if (!input.profession || input.profession === "Other") return "Choose a listed profession.";
  if (!input.gender) return "Gender is required.";
  if (!input.ethnicity) return "Ethnicity is required.";
  if (!input.timezone) return "IANA timezone is required.";
  if (!input.dateOfBirth) return "Date of birth is required.";
  if (input.bio && input.bio.length < 40) return "Self-introduction must be at least 40 characters.";
  return null;
}

export async function updateProfile(userId: number, payload: unknown): Promise<ProfileData> {
  const input = normalizeProfileUpdateInput(payload);
  const validationError = validateProfileUpdateInput(input);
  if (validationError) throw new Error(validationError);

  const professionId = await getProfessionId(input.profession);
  const genderId = await getGenderId(input.gender);
  const ethnicityId = await getEthnicityId(input.ethnicity);
  const timezoneId = await getTimezoneId(input.timezone);
  if (!professionId) throw new Error("Unable to save profession.");
  if (!genderId) throw new Error("Selected gender is not configured.");
  if (!ethnicityId) throw new Error("Selected ethnicity is not configured.");
  if (!timezoneId) throw new Error("Selected timezone is not configured.");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `
        UPDATE users
        SET profession_id = $2,
            gender_id = $3,
            ethnicity_id = $4,
            timezone_id = $5,
            date_of_birth = $6::date
        WHERE id = $1
          AND deleted_at IS NULL
      `,
      [userId, professionId, genderId, ethnicityId, timezoneId, input.dateOfBirth]
    );

    await client.query(
      `
        UPDATE proctor_applications
        SET bio = $2,
            image_urls = CASE WHEN $3::jsonb = '[]'::jsonb THEN image_urls ELSE $3::jsonb END,
            updated_at = NOW()
        WHERE id = (
          SELECT id
          FROM proctor_applications
          WHERE user_id = $1
            AND status = 'approved'
          ORDER BY reviewed_at DESC NULLS LAST, updated_at DESC
          LIMIT 1
        )
      `,
      [userId, input.bio, JSON.stringify(input.imageUrls)]
    );

    if (input.imageUrls.length > 0) {
      await client.query("DELETE FROM user_image WHERE user_id = $1", [userId]);
      for (const [index, imageUrl] of input.imageUrls.entries()) {
        const imageResult = await client.query<{ id: unknown }>(
          `
            INSERT INTO images (url, alt_text)
            VALUES ($1, $2)
            ON CONFLICT (url) DO UPDATE SET alt_text = EXCLUDED.alt_text, updated_at = NOW()
            RETURNING id
          `,
          [imageUrl, "Profile image"]
        );
        await client.query(
          "INSERT INTO user_image (user_id, image_id, is_primary, sort_order) VALUES ($1, $2, $3, $4)",
          [userId, toNumber(imageResult.rows[0].id), index === 0, index]
        );
      }
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return getProfile(userId);
}

export async function getUserIdByEmail(email: string) {
  const userResult = await pool.query(
    `
      SELECT id
      FROM users
      WHERE LOWER(email) = LOWER($1)
        AND deleted_at IS NULL
      LIMIT 1
    `,
    [email.trim()]
  );

  if (userResult.rows.length === 0) {
    return null;
  }

  return toNumber(userResult.rows[0].id);
}
