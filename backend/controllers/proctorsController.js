const pool = require("../database/pool");

function toNumber(value) {
  return typeof value === "number" ? value : Number(value);
}

function fullName(row) {
  return [row.first_name, row.last_name]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean)
    .join(" ");
}

function formatAddress(row) {
  return [row.address_street, row.address_city, row.address_state, row.address_zip_code]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean)
    .join(", ");
}

function parseDateTime(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function parseNumberFilter(value) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapProctor(row, options = {}) {
  const includeExactAddress = options.includeExactAddress !== false;
  const minimumHours = Number(row.minimum_hours || 1);
  const maximumHours = Math.max(minimumHours, Number(row.maximum_hours || minimumHours));
  const sessionWindow =
    minimumHours === maximumHours ? `${minimumHours} hr` : `${minimumHours}-${maximumHours} hr`;
  const profession = row.profession_name || "Interview Proctor";

  return {
    id: toNumber(row.id),
    name: fullName(row),
    email: row.email,
    credential: row.verification_status === "approved" ? "Verified proctor" : "",
    specialty: profession,
    profession,
    gender: row.gender_name || "",
    address: includeExactAddress ? row.address_street || "" : "",
    city: row.address_city || "",
    state: includeExactAddress ? row.address_state || "" : "",
    zipCode: includeExactAddress ? row.address_zip_code || "" : "",
    country: row.address_country || "United States",
    formattedAddress: includeExactAddress ? formatAddress(row) : [row.address_city, row.address_country || "United States"].filter(Boolean).join(", "),
    sessionWindow,
    rateUsd: row.hourly_rate == null ? null : toNumber(row.hourly_rate),
    hourlyRate: row.hourly_rate == null ? null : toNumber(row.hourly_rate),
    minimumHours,
    maximumHours,
    imageUrls: Array.isArray(row.image_urls) ? row.image_urls.filter(Boolean) : [],
    bio: row.bio || `${fullName(row)} is available for ${String(profession).toLowerCase()} assignments at the selected location.`,
    slotsAvailable: 8,
    ratingAverage: row.rating_average == null ? null : toNumber(row.rating_average),
    ratingCount: row.rating_count == null ? 0 : toNumber(row.rating_count),
    educations: [],
  };
}

function mapEducation(row) {
  return {
    degree: row.degree_name || "",
    school: row.school_name || "",
    major: row.major_name || "",
    startMonth: row.start_month instanceof Date ? row.start_month.toISOString().slice(0, 10) : row.start_month || null,
    endMonth: row.end_month instanceof Date ? row.end_month.toISOString().slice(0, 10) : row.end_month || null,
  };
}

async function getProctorEducations(proctorId) {
  const result = await pool.query(
    `
      SELECT
        d.name AS degree_name,
        sc.name AS school_name,
        m.name AS major_name,
        e.start_month,
        e.end_month
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
    [proctorId]
  );

  return result.rows.map(mapEducation);
}

async function queryProctors({ id, country, state, city, profession, gender, minRate, maxRate, minRating, start, end } = {}) {
  const params = [];
  const filters = ["r.name = 'proctor'", "u.deleted_at IS NULL"];
  const trimmedCountry = typeof country === "string" ? country.trim() : "";
  const trimmedState = typeof state === "string" ? state.trim() : "";
  const trimmedCity = typeof city === "string" ? city.trim() : "";
  const trimmedProfession = typeof profession === "string" ? profession.trim() : "";
  const trimmedGender = typeof gender === "string" ? gender.trim() : "";
  const parsedMinRate = parseNumberFilter(minRate);
  const parsedMaxRate = parseNumberFilter(maxRate);
  const parsedMinRating = parseNumberFilter(minRating);
  const availabilityStart = parseDateTime(start);
  const availabilityEnd = parseDateTime(end);

  if (id != null) {
    params.push(id);
    filters.push(`u.id = $${params.length}`);
  }

  if (trimmedCountry) {
    params.push(trimmedCountry);
    filters.push(`co.name = $${params.length}`);
  }

  if (trimmedState) {
    params.push(trimmedState);
    filters.push(`s.code = $${params.length}`);
  }

  if (trimmedCity) {
    params.push(trimmedCity);
    filters.push(`ci.name = $${params.length}`);
  }

  if (trimmedProfession) {
    params.push(trimmedProfession);
    filters.push(`p.name = $${params.length}`);
  }

  if (trimmedGender) {
    params.push(trimmedGender);
    filters.push(`g.name = $${params.length}`);
  }

  if (parsedMinRate != null) {
    params.push(String(parsedMinRate));
    filters.push(`u.hourly_rate >= $${params.length}::numeric`);
  }

  if (parsedMaxRate != null) {
    params.push(String(parsedMaxRate));
    filters.push(`u.hourly_rate <= $${params.length}::numeric`);
  }

  if (parsedMinRating != null) {
    params.push(String(parsedMinRating));
    filters.push(`ratings.rating_average >= $${params.length}::numeric`);
  }

  if (availabilityStart && availabilityEnd && availabilityStart.getTime() < availabilityEnd.getTime()) {
    params.push(availabilityStart);
    const startParam = params.length;
    params.push(availabilityEnd);
    const endParam = params.length;

    filters.push(`
      EXISTS (
        SELECT 1
        FROM tutor_availability ta
        JOIN timezones tz
          ON tz.id = u.timezone_id
        WHERE ta.user_id = u.id
          AND ta.day_of_week = EXTRACT(DOW FROM ($${startParam}::timestamptz AT TIME ZONE tz.name))::int
          AND ta.day_of_week = EXTRACT(DOW FROM ($${endParam}::timestamptz AT TIME ZONE tz.name))::int
          AND ta.start_time <= (($${startParam}::timestamptz AT TIME ZONE tz.name)::time)
          AND ta.end_time >= (($${endParam}::timestamptz AT TIME ZONE tz.name)::time)
      )
      AND NOT EXISTS (
        SELECT 1
        FROM bookings b
        JOIN statuses booking_status
          ON booking_status.id = b.status_id
        WHERE b.user_id = u.id
          AND booking_status.name <> 'canceled'
          AND b.start_time_utc < $${endParam}::timestamptz
          AND b.end_time_utc > $${startParam}::timestamptz
      )
    `);
  }

  const result = await pool.query(
    `
      SELECT
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        p.name AS profession_name,
        g.name AS gender_name,
        'approved' AS verification_status,
        NULL AS bio,
        a.street AS address_street,
        ci.name AS address_city,
        s.code AS address_state,
        a.zip_code AS address_zip_code,
        COALESCE(co.name, 'United States') AS address_country,
        u.hourly_rate,
        u.minimum_hours,
        u.maximum_hours,
        ratings.rating_average,
        COALESCE(ratings.rating_count, 0) AS rating_count,
        COALESCE(
          (
            SELECT array_agg(i.url ORDER BY ui.is_primary DESC, ui.sort_order ASC, i.id ASC)
            FROM user_image ui
            JOIN images i
              ON i.id = ui.image_id
            WHERE ui.user_id = u.id
          ),
          ARRAY[]::text[]
        ) AS image_urls
      FROM users u
      JOIN user_roles ur
        ON ur.user_id = u.id
      JOIN roles r
        ON r.id = ur.role_id
      LEFT JOIN professions p
        ON p.id = u.profession_id
      LEFT JOIN genders g
        ON g.id = u.gender_id
      LEFT JOIN addresses a
        ON a.id = u.proctor_address_id
      LEFT JOIN cities ci
        ON ci.id = a.city_id
      LEFT JOIN states s
        ON s.id = a.state_id
      LEFT JOIN countries co
        ON co.id = COALESCE(a.country_id, s.country_id)
      LEFT JOIN LATERAL (
        SELECT
          AVG(pr.rating)::numeric(3,1) AS rating_average,
          COUNT(*)::int AS rating_count
        FROM proctor_ratings pr
        JOIN bookings b
          ON b.id = pr.booking_id
         AND b.user_id = pr.proctor_id
        JOIN statuses status
          ON status.id = b.status_id
        WHERE pr.proctor_id = u.id
          AND status.name = 'completed'
      ) ratings ON TRUE
      WHERE ${filters.join(" AND ")}
      ORDER BY ci.name ASC NULLS LAST, u.last_name ASC NULLS LAST, u.id ASC
    `,
    params
  );

  return result.rows.map((row) => mapProctor(row, { includeExactAddress: id != null }));
}

exports.getProctorById = async (req, res) => {
  try {
    const proctors = await queryProctors({ id: Number(req.params.id) });
    if (proctors.length === 0) {
      return res.status(404).json({ error: "Proctor not found" });
    }

    const educations = await getProctorEducations(Number(req.params.id));
    return res.json({ ...proctors[0], educations });
  } catch (err) {
    console.error("getProctorById error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

exports.getAllProctors = async (req, res) => {
  try {
    const { country, state, city, profession, gender, minRate, maxRate, minRating, start, end } = req.query || {};
    const hasStart = typeof start === "string" && start.length > 0;
    const hasEnd = typeof end === "string" && end.length > 0;

    if (hasStart !== hasEnd) {
      return res.status(400).json({ error: "Both start and end are required for availability filtering." });
    }

    const parsedStart = parseDateTime(start);
    const parsedEnd = parseDateTime(end);

    if ((hasStart && !parsedStart) || (hasEnd && !parsedEnd)) {
      return res.status(400).json({ error: "Invalid availability time." });
    }

    if (parsedStart && parsedEnd && parsedStart.getTime() >= parsedEnd.getTime()) {
      return res.status(400).json({ error: "Availability end time must be after start time." });
    }

    const proctors = await queryProctors({
      country: typeof country === "string" ? country : null,
      state: typeof state === "string" ? state : null,
      city: typeof city === "string" ? city : null,
      profession: typeof profession === "string" ? profession : null,
      gender: typeof gender === "string" ? gender : null,
      minRate: typeof minRate === "string" ? minRate : null,
      maxRate: typeof maxRate === "string" ? maxRate : null,
      minRating: typeof minRating === "string" ? minRating : null,
      start: parsedStart ? parsedStart.toISOString() : null,
      end: parsedEnd ? parsedEnd.toISOString() : null,
    });
    return res.json(proctors);
  } catch (err) {
    console.error("getAllProctors error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
