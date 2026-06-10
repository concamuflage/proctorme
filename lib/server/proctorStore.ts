import pool from "@/lib/server/database/pool";

export type ProctorRecord = {
  id: number;
  name: string;
  email: string;
  credential: string;
  specialty: string;
  profession: string;
  gender: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  sessionWindow: string;
  rateUsd: number;
  hourlyRate: number;
  minimumHours: number;
  maximumHours: number;
  imageUrls: string[];
  bio: string;
  slotsAvailable: number;
  ratingAverage: number | null;
  ratingCount: number;
  ratings: ProctorRating[];
  educations: ProctorEducation[];
};

export type ProctorRating = {
  id: number;
  bookingId: number;
  rating: number;
  review: string;
  reviewerName: string;
  createdAt: string;
};

export type ProctorEducation = {
  degree: string;
  school: string;
  major: string;
  startMonth: string | null;
  endMonth: string | null;
};

export type ProctorAvailabilitySlot = {
  id: string;
  dateId: string;
  dateLabel: string;
  dayLabel: string;
  index: number;
  startLabel: string;
  endLabel: string;
  startIso: string;
  endIso: string;
  available: boolean;
};

export type ProctorAvailabilityDay = {
  id: string;
  dateLabel: string;
  dayLabel: string;
  slots: ProctorAvailabilitySlot[];
};

export type ProctorAvailability = {
  timezone: string;
  days: ProctorAvailabilityDay[];
};

type ProctorRow = {
  id: unknown;
  email: unknown;
  first_name: unknown;
  last_name: unknown;
  profession_name: unknown;
  gender_name: unknown;
  verification_status: unknown;
  bio: unknown;
  address_street: unknown;
  address_city: unknown;
  address_state: unknown;
  address_zip_code: unknown;
  address_country: unknown;
  hourly_rate: unknown;
  minimum_hours: unknown;
  maximum_hours: unknown;
  rating_average: unknown;
  rating_count: unknown;
  image_urls: unknown;
};

type AvailabilityRow = {
  day_of_week: unknown;
  start_time: unknown;
  end_time: unknown;
  timezone_name: unknown;
};

type BookingRow = {
  start_time_utc: Date;
  end_time_utc: Date;
};

type RatingRow = {
  id: unknown;
  booking_id: unknown;
  rating: unknown;
  comment: unknown;
  reviewer_first_name: unknown;
  reviewer_last_name: unknown;
  created_at: Date;
};

type EducationRow = {
  degree_name: unknown;
  school_name: unknown;
  major_name: unknown;
  start_month: Date | string | null;
  end_month: Date | string | null;
};

type ProctorListFilters = {
  country?: string | null;
  state?: string | null;
  city?: string | null;
  profession?: string | null;
  gender?: string | null;
  minRate?: string | null;
  maxRate?: string | null;
  minRating?: string | null;
  start?: string | null;
  end?: string | null;
};

export type ProctorFilterOptions = {
  countries: string[];
  states: string[];
  cities: string[];
  professions: string[];
  genders: string[];
  hourlyRateMin: number | null;
  hourlyRateMax: number | null;
  cityTimeZone: string | null;
};

type AvailabilityWindow = {
  start: Date;
  end: Date;
};

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
 * Runs the text logic for this module.
 *
 * @param value - Input used by text.
 *
 * @returns The result used by the surrounding flow.
 */
function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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
  const parsed = value == null ? NaN : toNumber(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Formats hour value for display.
 *
 * @param value - Input used by format hour value.
 *
 * @returns The formatted display value.
 */
function formatHourValue(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

/**
 * Formats hours for display.
 *
 * @param minimumHours - Input used by format hours.
 * @param maximumHours - Input used by format hours.
 *
 * @returns The formatted display value.
 */
function formatHours(minimumHours: number, maximumHours: number) {
  if (minimumHours === maximumHours) {
    return `${formatHourValue(minimumHours)} hr`;
  }
  return `${formatHourValue(minimumHours)}-${formatHourValue(maximumHours)} hr`;
}

/**
 * Runs the text array logic for this module.
 *
 * @param value - Input used by text array.
 *
 * @returns The result used by the surrounding flow.
 */
function textArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => text(item)).filter(Boolean)
    : [];
}

/**
 * Runs the start of local day logic for this module.
 *
 * @param date - Input used by start of local day.
 *
 * @returns The result used by the surrounding flow.
 */
function startOfLocalDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

/**
 * Runs the add days logic for this module.
 *
 * @param date - Input used by add days.
 * @param days - Input used by add days.
 *
 * @returns The result used by the surrounding flow.
 */
function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/**
 * Runs the add hours logic for this module.
 *
 * @param date - Input used by add hours.
 * @param hours - Input used by add hours.
 *
 * @returns The result used by the surrounding flow.
 */
function addHours(date: Date, hours: number) {
  const next = new Date(date);
  next.setHours(next.getHours() + hours);
  return next;
}

/**
 * Formats date id for display.
 *
 * @param date - Input used by format date id.
 *
 * @returns The formatted display value.
 */
function formatDateId(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parses date id from an external value.
 *
 * @param value - Input used by parse date id.
 *
 * @returns The parsed value, or null when parsing fails.
 */
function parseDateId(value: string | null | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return startOfLocalDay(new Date());
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isFinite(date.getTime()) ? startOfLocalDay(date) : startOfLocalDay(new Date());
}

/**
 * Parses date time from an external value.
 *
 * @param value - Input used by parse date time.
 *
 * @returns The parsed value, or null when parsing fails.
 */
function parseDateTime(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

/**
 * Parses number filter from an external value.
 *
 * @param value - Input used by parse number filter.
 *
 * @returns The parsed value, or null when parsing fails.
 */
function parseNumberFilter(value: string | null | undefined) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Parses availability window from an external value.
 *
 * @param filters - Input used by parse availability window.
 *
 * @returns The parsed value, or null when parsing fails.
 */
function parseAvailabilityWindow(filters?: ProctorListFilters): AvailabilityWindow | null {
  const start = parseDateTime(filters?.start);
  const end = parseDateTime(filters?.end);

  if (!start || !end || start.getTime() >= end.getTime()) {
    return null;
  }

  return { start, end };
}

/**
 * Formats date for display.
 *
 * @param date - Input used by format date.
 *
 * @returns The formatted display value.
 */
function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

/**
 * Formats day for display.
 *
 * @param date - Input used by format day.
 *
 * @returns The formatted display value.
 */
function formatDay(date: Date) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date);
}

/**
 * Formats time for display.
 *
 * @param date - Input used by format time.
 *
 * @returns The formatted display value.
 */
function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date);
}

/**
 * Runs the time to minutes logic for this module.
 *
 * @param value - Input used by time to minutes.
 *
 * @returns The result used by the surrounding flow.
 */
function timeToMinutes(value: unknown) {
  const match = text(value).match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/**
 * Runs the slot overlaps booking logic for this module.
 *
 * @param start - Input used by slot overlaps booking.
 * @param end - Input used by slot overlaps booking.
 * @param bookings - Input used by slot overlaps booking.
 *
 * @returns The result used by the surrounding flow.
 */
function slotOverlapsBooking(start: Date, end: Date, bookings: BookingRow[]) {
  const startMs = start.getTime();
  const endMs = end.getTime();
  return bookings.some((booking) => booking.start_time_utc.getTime() < endMs && booking.end_time_utc.getTime() > startMs);
}

/**
 * Runs the map rating logic for this module.
 *
 * @param row - Input used by map rating.
 *
 * @returns The result used by the surrounding flow.
 */
function mapRating(row: RatingRow): ProctorRating {
  const reviewerName = [text(row.reviewer_first_name), text(row.reviewer_last_name)].filter(Boolean).join(" ");

  return {
    id: toNumber(row.id),
    bookingId: toNumber(row.booking_id),
    rating: toNumber(row.rating),
    review: text(row.comment),
    reviewerName: reviewerName || "Interviewer",
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at ?? ""),
  };
}

/**
 * Runs the date to iso date logic for this module.
 *
 * @param value - Input used by date to iso date.
 *
 * @returns The result used by the surrounding flow.
 */
function dateToIsoDate(value: Date | string | null) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return text(value) || null;
}

/**
 * Runs the map education logic for this module.
 *
 * @param row - Input used by map education.
 *
 * @returns The result used by the surrounding flow.
 */
function mapEducation(row: EducationRow): ProctorEducation {
  return {
    degree: text(row.degree_name),
    school: text(row.school_name),
    major: text(row.major_name),
    startMonth: dateToIsoDate(row.start_month),
    endMonth: dateToIsoDate(row.end_month),
  };
}

/**
 * Runs the map proctor logic for this module.
 *
 * @param row - Input used by map proctor.
 *
 * @returns The result used by the surrounding flow.
 */
function mapProctor(row: ProctorRow): ProctorRecord {
  const firstName = text(row.first_name);
  const lastName = text(row.last_name);
  const name = [firstName, lastName].filter(Boolean).join(" ") || text(row.email);
  const profession = text(row.profession_name) || "Interview Proctor";
  const hourlyRate = positiveNumber(row.hourly_rate, 0);
  const minimumHours = positiveNumber(row.minimum_hours, 1);
  const maximumHours = Math.max(minimumHours, positiveNumber(row.maximum_hours, minimumHours));

  return {
    id: toNumber(row.id),
    name,
    email: text(row.email),
    credential: text(row.verification_status) === "approved" ? "Verified proctor" : "",
    specialty: profession,
    profession,
    gender: text(row.gender_name),
    address: text(row.address_street),
    city: text(row.address_city),
    state: text(row.address_state),
    zipCode: text(row.address_zip_code),
    country: text(row.address_country) || "United States",
    sessionWindow: formatHours(minimumHours, maximumHours),
    rateUsd: hourlyRate,
    hourlyRate,
    minimumHours,
    maximumHours,
    imageUrls: textArray(row.image_urls),
    bio: text(row.bio) || `${name} is available for ${profession.toLowerCase()} assignments at the selected location.`,
    slotsAvailable: 8,
    ratingAverage: row.rating_average == null ? null : Number(toNumber(row.rating_average).toFixed(1)),
    ratingCount: row.rating_count == null ? 0 : toNumber(row.rating_count),
    ratings: [],
    educations: [],
  };
}

/**
 * Gets proctor ratings for this flow.
 *
 * @param proctorId - Input used by get proctor ratings.
 *
 * @returns The result used by the surrounding flow.
 */
async function getProctorRatings(proctorId: number) {
  const result = await pool.query<RatingRow>(
    `
      SELECT
        pr.id,
        pr.booking_id,
        pr.rating,
        pr.comment,
        reviewer.first_name AS reviewer_first_name,
        reviewer.last_name AS reviewer_last_name,
        pr.created_at
      FROM proctor_ratings pr
      JOIN bookings b
        ON b.id = pr.booking_id
       AND b.user_id = pr.proctor_id
      JOIN statuses s
        ON s.id = b.status_id
      LEFT JOIN users reviewer
        ON reviewer.id = pr.institution_user_id
      WHERE pr.proctor_id = $1
        AND s.name = 'completed'
      ORDER BY pr.created_at DESC, pr.id DESC
    `,
    [proctorId]
  );
  const ratings: ProctorRating[] = result.rows.map((row: RatingRow) => mapRating(row));
  const ratingAverage =
    ratings.length === 0
      ? null
      : Number((ratings.reduce((sum: number, rating: ProctorRating) => sum + rating.rating, 0) / ratings.length).toFixed(1));

  return {
    ratingAverage,
    ratingCount: ratings.length,
    ratings,
  };
}

/**
 * Gets proctor educations for this flow.
 *
 * @param proctorId - Input used by get proctor educations.
 *
 * @returns The result used by the surrounding flow.
 */
async function getProctorEducations(proctorId: number) {
  const result = await pool.query<EducationRow>(
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

/**
 * Runs the list proctors logic for this module.
 *
 * @param filters - Input used by list proctors.
 *
 * @returns The result used by the surrounding flow.
 */
export async function listProctors(filters?: ProctorListFilters) {
  const params: Array<string | Date> = [];
  const whereClauses = ["r.name = 'proctor'", "u.deleted_at IS NULL"];
  const country = filters?.country?.trim();
  const state = filters?.state?.trim();
  const city = filters?.city?.trim();
  const profession = filters?.profession?.trim();
  const gender = filters?.gender?.trim();
  const minRate = parseNumberFilter(filters?.minRate);
  const maxRate = parseNumberFilter(filters?.maxRate);
  const minRating = parseNumberFilter(filters?.minRating);
  const availabilityWindow = parseAvailabilityWindow(filters);

  if (country) {
    params.push(country);
    whereClauses.push(`co.name = $${params.length}`);
  }

  if (state) {
    params.push(state);
    whereClauses.push(`s.code = $${params.length}`);
  }

  if (city) {
    params.push(city);
    whereClauses.push(`ci.name = $${params.length}`);
  }

  if (profession) {
    params.push(profession);
    whereClauses.push(`p.name = $${params.length}`);
  }

  if (gender) {
    params.push(gender);
    whereClauses.push(`g.name = $${params.length}`);
  }

  if (minRate != null) {
    params.push(String(minRate));
    whereClauses.push(`u.hourly_rate >= $${params.length}::numeric`);
  }

  if (maxRate != null) {
    params.push(String(maxRate));
    whereClauses.push(`u.hourly_rate <= $${params.length}::numeric`);
  }

  if (minRating != null) {
    params.push(String(minRating));
    whereClauses.push(`ratings.rating_average >= $${params.length}::numeric`);
  }

  if (availabilityWindow) {
    params.push(availabilityWindow.start);
    const startParam = params.length;
    params.push(availabilityWindow.end);
    const endParam = params.length;

    whereClauses.push(`
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

  const result = await pool.query<ProctorRow>(
    `
      SELECT
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        p.name AS profession_name,
        g.name AS gender_name,
        'approved' AS verification_status,
        pa.bio AS bio,
        NULL AS address_street,
        ci.name AS address_city,
        s.code AS address_state,
        NULL AS address_zip_code,
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
          (
            SELECT array_agg(image_url)
            FROM jsonb_array_elements_text(pa.image_urls) AS image_url
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
      LEFT JOIN proctor_applications pa
        ON pa.user_id = u.id
       AND pa.status = 'approved'
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
      WHERE ${whereClauses.join(" AND ")}
      ORDER BY ci.name ASC NULLS LAST, u.last_name ASC NULLS LAST, u.id ASC
    `,
    params
  );

  return result.rows.map(mapProctor);
}

type FilterOptionsRow = {
  countries: unknown;
  states: unknown;
  cities: unknown;
  professions: unknown;
  genders: unknown;
  hourly_rate_min: unknown;
  hourly_rate_max: unknown;
};

type CityTimezoneRow = {
  city_id: unknown;
  state_id: unknown;
  country_id: unknown;
  cached_timezone_name: unknown;
  state_code: unknown;
  country_name: unknown;
};

type TimezoneIdRow = {
  id: unknown;
};

type GoogleGeocodeResponse = {
  status?: string;
  results?: Array<{
    geometry?: {
      location?: {
        lat?: number;
        lng?: number;
      };
    };
  }>;
};

type GoogleTimeZoneResponse = {
  status?: string;
  timeZoneId?: string;
};

/**
 * Runs the google maps api key logic for this module.
 *
 * @returns The result used by the surrounding flow.
 */
function googleMapsApiKey() {
  return process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_API_KEY || "";
}

/**
 * Runs the city location query logic for this module.
 *
 * @param city - Input used by city location query.
 * @param state - Input used by city location query.
 * @param country - Input used by city location query.
 *
 * @returns The result used by the surrounding flow.
 */
function cityLocationQuery(city: string, state: string, country: string) {
  return [city, state, country].map((part) => part.trim()).filter(Boolean).join(", ");
}

/**
 * Gets google city time zone for this flow.
 *
 * @param city - Input used by get google city time zone.
 * @param state - Input used by get google city time zone.
 * @param country - Input used by get google city time zone.
 *
 * @returns The result used by the surrounding flow.
 */
async function getGoogleCityTimeZone(city: string, state: string, country: string) {
  const apiKey = googleMapsApiKey();
  if (!apiKey) return null;

  const address = cityLocationQuery(city, state, country);
  if (!address) return null;

  try {
    const geocodeParams = new URLSearchParams({
      address,
      key: apiKey,
    });
    const geocodeResponse = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${geocodeParams.toString()}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    if (!geocodeResponse.ok) return null;

    const geocodePayload = (await geocodeResponse.json().catch(() => null)) as GoogleGeocodeResponse | null;
    if (geocodePayload?.status !== "OK") return null;

    const location = geocodePayload.results?.[0]?.geometry?.location;
    if (typeof location?.lat !== "number" || typeof location.lng !== "number") return null;

    const timeZoneParams = new URLSearchParams({
      location: `${location.lat},${location.lng}`,
      timestamp: String(Math.floor(Date.now() / 1000)),
      key: apiKey,
    });
    const timeZoneResponse = await fetch(`https://maps.googleapis.com/maps/api/timezone/json?${timeZoneParams.toString()}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    if (!timeZoneResponse.ok) return null;

    const timeZonePayload = (await timeZoneResponse.json().catch(() => null)) as GoogleTimeZoneResponse | null;
    return timeZonePayload?.status === "OK" && typeof timeZonePayload.timeZoneId === "string"
      ? timeZonePayload.timeZoneId
      : null;
  } catch {
    return null;
  }
}

/**
 * Runs the cache city time zone logic for this module.
 *
 * @param location - Input used by cache city time zone.
 * @param timeZoneName - Input used by cache city time zone.
 * @param source - Input used by cache city time zone.
 *
 * @returns The result used by the surrounding flow.
 */
async function cacheCityTimeZone(location: CityTimezoneRow, timeZoneName: string, source: string) {
  const cityId = toNumber(location.city_id);
  const stateId = toNumber(location.state_id);
  const countryId = toNumber(location.country_id);

  if (!Number.isInteger(cityId) || !Number.isInteger(stateId) || !Number.isInteger(countryId)) {
    return;
  }

  const timezoneResult = await pool.query<TimezoneIdRow>(
    `
      INSERT INTO timezones (name)
      VALUES ($1)
      ON CONFLICT (name) DO UPDATE
        SET name = EXCLUDED.name
      RETURNING id
    `,
    [timeZoneName]
  );
  
  const timezoneId = toNumber(timezoneResult.rows[0]?.id);
  if (!Number.isInteger(timezoneId)) return;

  await pool.query(
    `
      INSERT INTO city_timezones (
        city_id,
        state_id,
        country_id,
        timezone_id,
        source,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      ON CONFLICT (city_id, state_id, country_id) DO UPDATE
        SET timezone_id = EXCLUDED.timezone_id,
            source = EXCLUDED.source,
            updated_at = NOW()
    `,
    [cityId, stateId, countryId, timezoneId, source]
  );
}

/**
 * Gets cached or resolved city time zone for this flow.
 *
 * @param city - Input used by get cached or resolved city time zone.
 * @param state - Input used by get cached or resolved city time zone.
 * @param country - Input used by get cached or resolved city time zone.
 *
 * @returns The result used by the surrounding flow.
 */
export async function getCachedOrResolvedCityTimeZone(city: string, state: string, country: string) {
  const timezoneResult = await pool.query<CityTimezoneRow>(
    `
      SELECT
        cities.id AS city_id,
        states.id AS state_id,
        countries.id AS country_id,
        timezones.name AS cached_timezone_name,
        states.code AS state_code,
        COALESCE(countries.name, countries.country, 'United States') AS country_name
      FROM cities
      JOIN states
        ON states.id = cities.state_id
      JOIN countries
        ON countries.id = states.country_id
      LEFT JOIN city_timezones
        ON city_timezones.city_id = cities.id
       AND city_timezones.state_id = states.id
       AND city_timezones.country_id = countries.id
      LEFT JOIN timezones
        ON timezones.id = city_timezones.timezone_id
      WHERE cities.name = $1
        AND ($2::text IS NULL OR states.code = $2)
        AND ($3::text IS NULL OR COALESCE(countries.name, countries.country) = $3)
      ORDER BY timezones.name NULLS LAST, states.code ASC NULLS LAST
      LIMIT 1
    `,
    [city, state, country]
  );
  const timezoneRow = timezoneResult.rows[0];
  if (!timezoneRow) {
    return getGoogleCityTimeZone(city, state, country);
  }

  const cachedTimeZone = text(timezoneRow.cached_timezone_name);
  if (cachedTimeZone) return cachedTimeZone;

  const googleTimeZone = await getGoogleCityTimeZone(
    city,
    state,
    country
  );

  if (googleTimeZone) {
    await cacheCityTimeZone(timezoneRow, googleTimeZone, "google");
  }

  return googleTimeZone;
}

/**
 * Gets proctor filter options for this flow.
 *
 * @param filters - Input used by get proctor filter options.
 *
 * @returns The result used by the surrounding flow.
 */
export async function getProctorFilterOptions(filters?: Pick<ProctorListFilters, "country" | "state" | "city" | "profession" | "gender">): Promise<ProctorFilterOptions> {
  const country = filters?.country?.trim();
  const state = filters?.state?.trim();
  const city = filters?.city?.trim();
  const profession = filters?.profession?.trim();
  const gender = filters?.gender?.trim();
  const params: string[] = [];
  const baseWhere = ["r.name = 'proctor'", "u.deleted_at IS NULL"];

  /**
   * Runs the where without logic for this module.
   *
   * @param excluded - Input used by where without.
   *
   * @returns The result used by the surrounding flow.
   */
  const whereWithout = (excluded: "country" | "state" | "city" | "profession" | "gender") => {
    const clauses = [...baseWhere];
    const values: string[] = [];

    if (excluded !== "country" && country) {
      values.push(country);
      clauses.push(`co.name = $${values.length}`);
    }

    if (excluded !== "state" && state) {
      values.push(state);
      clauses.push(`s.code = $${values.length}`);
    }

    if (excluded !== "city" && city) {
      values.push(city);
      clauses.push(`ci.name = $${values.length}`);
    }

    if (excluded !== "profession" && profession) {
      values.push(profession);
      clauses.push(`p.name = $${values.length}`);
    }

    if (excluded !== "gender" && gender) {
      values.push(gender);
      clauses.push(`g.name = $${values.length}`);
    }

    const offsetClauses = clauses.map((clause) =>
      clause.replace(/\$(\d+)/g, (_, index) => `$${params.length + Number(index)}`)
    );
    params.push(...values);

    return offsetClauses.join(" AND ");
  };

  const result = await pool.query<FilterOptionsRow>(
    `
      SELECT
        (
          SELECT COALESCE(array_agg(DISTINCT co.name ORDER BY co.name) FILTER (WHERE co.name IS NOT NULL AND co.name <> ''), ARRAY[]::text[])
          FROM users u
          JOIN user_roles ur ON ur.user_id = u.id
          JOIN roles r ON r.id = ur.role_id
          LEFT JOIN professions p ON p.id = u.profession_id
          LEFT JOIN genders g ON g.id = u.gender_id
          LEFT JOIN addresses a ON a.id = u.proctor_address_id
          LEFT JOIN cities ci ON ci.id = a.city_id
          LEFT JOIN states s ON s.id = a.state_id
          LEFT JOIN countries co ON co.id = COALESCE(a.country_id, s.country_id)
          WHERE ${whereWithout("country")}
        ) AS countries,
        (
          SELECT COALESCE(array_agg(DISTINCT s.code ORDER BY s.code) FILTER (WHERE s.code IS NOT NULL AND s.code <> ''), ARRAY[]::text[])
          FROM users u
          JOIN user_roles ur ON ur.user_id = u.id
          JOIN roles r ON r.id = ur.role_id
          LEFT JOIN professions p ON p.id = u.profession_id
          LEFT JOIN genders g ON g.id = u.gender_id
          LEFT JOIN addresses a ON a.id = u.proctor_address_id
          LEFT JOIN cities ci ON ci.id = a.city_id
          LEFT JOIN states s ON s.id = a.state_id
          LEFT JOIN countries co ON co.id = COALESCE(a.country_id, s.country_id)
          WHERE ${whereWithout("state")}
        ) AS states,
        (
          SELECT COALESCE(array_agg(DISTINCT ci.name ORDER BY ci.name) FILTER (WHERE ci.name IS NOT NULL AND ci.name <> ''), ARRAY[]::text[])
          FROM users u
          JOIN user_roles ur ON ur.user_id = u.id
          JOIN roles r ON r.id = ur.role_id
          LEFT JOIN professions p ON p.id = u.profession_id
          LEFT JOIN genders g ON g.id = u.gender_id
          LEFT JOIN addresses a ON a.id = u.proctor_address_id
          LEFT JOIN cities ci ON ci.id = a.city_id
          LEFT JOIN states s ON s.id = a.state_id
          LEFT JOIN countries co ON co.id = COALESCE(a.country_id, s.country_id)
          WHERE ${whereWithout("city")}
        ) AS cities,
        (
          SELECT COALESCE(array_agg(DISTINCT p.name ORDER BY p.name) FILTER (WHERE p.name IS NOT NULL AND p.name <> ''), ARRAY[]::text[])
          FROM users u
          JOIN user_roles ur ON ur.user_id = u.id
          JOIN roles r ON r.id = ur.role_id
          LEFT JOIN professions p ON p.id = u.profession_id
          LEFT JOIN genders g ON g.id = u.gender_id
          LEFT JOIN addresses a ON a.id = u.proctor_address_id
          LEFT JOIN cities ci ON ci.id = a.city_id
          LEFT JOIN states s ON s.id = a.state_id
          LEFT JOIN countries co ON co.id = COALESCE(a.country_id, s.country_id)
          WHERE ${whereWithout("profession")}
        ) AS professions,
        (
          SELECT COALESCE(array_agg(DISTINCT g.name ORDER BY g.name) FILTER (WHERE g.name IS NOT NULL AND g.name <> ''), ARRAY[]::text[])
          FROM users u
          JOIN user_roles ur ON ur.user_id = u.id
          JOIN roles r ON r.id = ur.role_id
          LEFT JOIN professions p ON p.id = u.profession_id
          LEFT JOIN genders g ON g.id = u.gender_id
          LEFT JOIN addresses a ON a.id = u.proctor_address_id
          LEFT JOIN cities ci ON ci.id = a.city_id
          LEFT JOIN states s ON s.id = a.state_id
          LEFT JOIN countries co ON co.id = COALESCE(a.country_id, s.country_id)
          WHERE ${whereWithout("gender")}
        ) AS genders,
        (
          SELECT MIN(u.hourly_rate)
          FROM users u
          JOIN user_roles ur ON ur.user_id = u.id
          JOIN roles r ON r.id = ur.role_id
          LEFT JOIN professions p ON p.id = u.profession_id
          LEFT JOIN genders g ON g.id = u.gender_id
          LEFT JOIN addresses a ON a.id = u.proctor_address_id
          LEFT JOIN cities ci ON ci.id = a.city_id
          LEFT JOIN states s ON s.id = a.state_id
          LEFT JOIN countries co ON co.id = COALESCE(a.country_id, s.country_id)
          WHERE ${whereWithout("profession")}
        ) AS hourly_rate_min,
        (
          SELECT MAX(u.hourly_rate)
          FROM users u
          JOIN user_roles ur ON ur.user_id = u.id
          JOIN roles r ON r.id = ur.role_id
          LEFT JOIN professions p ON p.id = u.profession_id
          LEFT JOIN genders g ON g.id = u.gender_id
          LEFT JOIN addresses a ON a.id = u.proctor_address_id
          LEFT JOIN cities ci ON ci.id = a.city_id
          LEFT JOIN states s ON s.id = a.state_id
          LEFT JOIN countries co ON co.id = COALESCE(a.country_id, s.country_id)
          WHERE ${whereWithout("profession")}
        ) AS hourly_rate_max
    `,
    params
  );

  const row = result.rows[0];
  let cityTimeZone: string | null = null;

  if (city && state && country) {
    cityTimeZone = await getCachedOrResolvedCityTimeZone(city, state, country);
  }

  return {
    countries: textArray(row?.countries).sort((a, b) => a.localeCompare(b)),
    states: textArray(row?.states).sort((a, b) => a.localeCompare(b)),
    cities: textArray(row?.cities).sort((a, b) => a.localeCompare(b)),
    professions: textArray(row?.professions).sort((a, b) => a.localeCompare(b)),
    genders: textArray(row?.genders).sort((a, b) => a.localeCompare(b)),
    hourlyRateMin: row?.hourly_rate_min == null ? null : toNumber(row.hourly_rate_min),
    hourlyRateMax: row?.hourly_rate_max == null ? null : toNumber(row.hourly_rate_max),
    cityTimeZone,
  };
}

/**
 * Gets proctor by id for this flow.
 *
 * @param proctorId - Input used by get proctor by id.
 *
 * @returns The result used by the surrounding flow.
 */
export async function getProctorById(proctorId: number) {
  const result = await pool.query<ProctorRow>(
    `
      SELECT
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        p.name AS profession_name,
        g.name AS gender_name,
        'approved' AS verification_status,
        pa.bio AS bio,
        a.street AS address_street,
        ci.name AS address_city,
        s.code AS address_state,
        a.zip_code AS address_zip_code,
        COALESCE(co.name, 'United States') AS address_country,
        u.hourly_rate,
        u.minimum_hours,
        u.maximum_hours,
        NULL AS rating_average,
        0 AS rating_count,
        COALESCE(
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
      LEFT JOIN proctor_applications pa
        ON pa.user_id = u.id
       AND pa.status = 'approved'
      WHERE u.id = $1
        AND r.name = 'proctor'
        AND u.deleted_at IS NULL
      LIMIT 1
    `,
    [proctorId]
  );

  if (!result.rows[0]) return null;

  const proctor = mapProctor(result.rows[0]);
  const [ratingSummary, educations] = await Promise.all([
    getProctorRatings(proctor.id),
    getProctorEducations(proctor.id),
  ]);
  return {
    ...proctor,
    ...ratingSummary,
    educations,
  };
}

/**
 * Gets proctor availability for this flow.
 *
 * @param proctorId - Input used by get proctor availability.
 * @param options - Input used by get proctor availability.
 *
 * @returns The result used by the surrounding flow.
 */
export async function getProctorAvailability(
  proctorId: number,
  options?: { start?: string | null; days?: number | null }
): Promise<ProctorAvailability> {
  const dayCount = Math.min(Math.max(Number(options?.days) || 7, 1), 14);
  const startDate = parseDateId(options?.start);
  const endDate = addDays(startDate, dayCount);

  const availabilityResult = await pool.query<AvailabilityRow>(
    `
      SELECT
        ta.day_of_week,
        ta.start_time,
        ta.end_time,
        tz.name AS timezone_name
      FROM tutor_availability ta
      JOIN users u
        ON u.id = ta.user_id
      JOIN timezones tz
        ON tz.id = u.timezone_id
      WHERE ta.user_id = $1
      ORDER BY ta.day_of_week ASC, ta.start_time ASC
    `,
    [proctorId]
  );

  const bookingResult = await pool.query<BookingRow>(
    `
      SELECT b.start_time_utc, b.end_time_utc
      FROM bookings b
      JOIN statuses s
        ON s.id = b.status_id
      WHERE b.user_id = $1
        AND s.name <> 'canceled'
        AND b.start_time_utc < $3
        AND b.end_time_utc > $2
      ORDER BY b.start_time_utc ASC
    `,
    [proctorId, startDate, endDate]
  );

  const availabilityByDay = new Map<number, Array<{ startMinutes: number; endMinutes: number }>>();
  let timezone = "Local time";

  for (const row of availabilityResult.rows) {
    const dayOfWeek = Number(row.day_of_week);
    const startMinutes = timeToMinutes(row.start_time);
    const endMinutes = timeToMinutes(row.end_time);
    const timezoneName = text(row.timezone_name);

    if (timezoneName) timezone = timezoneName;
    if (!Number.isInteger(dayOfWeek) || startMinutes == null || endMinutes == null) continue;

    const ranges = availabilityByDay.get(dayOfWeek) ?? [];
    ranges.push({ startMinutes, endMinutes });
    availabilityByDay.set(dayOfWeek, ranges);
  }

  const days = Array.from({ length: dayCount }, (_, dayIndex): ProctorAvailabilityDay => {
    const date = addDays(startDate, dayIndex);
    const dateId = formatDateId(date);
    const dateLabel = formatDate(date);
    const dayLabel = formatDay(date);
    const ranges = availabilityByDay.get(date.getDay()) ?? [];

    const slots = Array.from({ length: 10 }, (_, index): ProctorAvailabilitySlot => {
      const hour = 8 + index;
      const slotStart = new Date(date);
      slotStart.setHours(hour, 0, 0, 0);
      const slotEnd = addHours(slotStart, 1);
      const startMinutes = hour * 60;
      const endMinutes = startMinutes + 60;
      const inAvailability = ranges.some((range) => range.startMinutes <= startMinutes && range.endMinutes >= endMinutes);
      const booked = slotOverlapsBooking(slotStart, slotEnd, bookingResult.rows);

      return {
        id: `${dateId}-${hour}`,
        dateId,
        dateLabel,
        dayLabel,
        index,
        startLabel: formatTime(slotStart),
        endLabel: formatTime(slotEnd),
        startIso: slotStart.toISOString(),
        endIso: slotEnd.toISOString(),
        available: inAvailability && !booked,
      };
    });

    return { id: dateId, dateLabel, dayLabel, slots };
  });

  return { timezone, days };
}
