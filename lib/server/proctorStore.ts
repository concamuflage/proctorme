import pool from "@/backend/database/pool";

export type ProctorRecord = {
  id: number;
  name: string;
  email: string;
  credential: string;
  specialty: string;
  profession: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
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
};

export type ProctorRating = {
  id: number;
  bookingId: number;
  rating: number;
  review: string;
  reviewerName: string;
  createdAt: string;
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
  address_street: unknown;
  address_city: unknown;
  address_state: unknown;
  address_zip_code: unknown;
  hourly_rate: unknown;
  minimum_hours: unknown;
  maximum_hours: unknown;
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

function toNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value);
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function positiveNumber(value: unknown, fallback: number) {
  const parsed = value == null ? NaN : toNumber(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function formatHourValue(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function formatHours(minimumHours: number, maximumHours: number) {
  if (minimumHours === maximumHours) {
    return `${formatHourValue(minimumHours)} hr`;
  }
  return `${formatHourValue(minimumHours)}-${formatHourValue(maximumHours)} hr`;
}

function textArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => text(item)).filter(Boolean)
    : [];
}

function startOfLocalDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addHours(date: Date, hours: number) {
  const next = new Date(date);
  next.setHours(next.getHours() + hours);
  return next;
}

function formatDateId(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateId(value: string | null | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return startOfLocalDay(new Date());
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isFinite(date.getTime()) ? startOfLocalDay(date) : startOfLocalDay(new Date());
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

function formatDay(date: Date) {
  return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date);
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date);
}

function timeToMinutes(value: unknown) {
  const match = text(value).match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function slotOverlapsBooking(start: Date, end: Date, bookings: BookingRow[]) {
  const startMs = start.getTime();
  const endMs = end.getTime();
  return bookings.some((booking) => booking.start_time_utc.getTime() < endMs && booking.end_time_utc.getTime() > startMs);
}

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
    credential: "Verified proctor",
    specialty: profession,
    profession,
    address: text(row.address_street),
    city: text(row.address_city),
    state: text(row.address_state),
    zipCode: text(row.address_zip_code),
    sessionWindow: formatHours(minimumHours, maximumHours),
    rateUsd: hourlyRate,
    hourlyRate,
    minimumHours,
    maximumHours,
    imageUrls: textArray(row.image_urls),
    bio: `${name} is available for ${profession.toLowerCase()} assignments at the selected location.`,
    slotsAvailable: 8,
    ratingAverage: null,
    ratingCount: 0,
    ratings: [],
  };
}

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

export async function listProctors(filters?: { city?: string | null }) {
  const params: string[] = [];
  const whereClauses = ["r.name = 'proctor'", "u.deleted_at IS NULL"];
  const city = filters?.city?.trim();

  if (city) {
    params.push(`%${city}%`);
    whereClauses.push(`ci.name ILIKE $${params.length}`);
  }

  const result = await pool.query<ProctorRow>(
    `
      SELECT
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        p.name AS profession_name,
        a.street AS address_street,
        ci.name AS address_city,
        s.code AS address_state,
        a.zip_code AS address_zip_code,
        u.hourly_rate,
        u.minimum_hours,
        u.maximum_hours,
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
      JOIN roles r
        ON r.id = u.role_id
      LEFT JOIN professions p
        ON p.id = u.profession_id
      LEFT JOIN addresses a
        ON a.id = u.proctor_address_id
      LEFT JOIN cities ci
        ON ci.id = a.city_id
      LEFT JOIN states s
        ON s.id = a.state_id
      WHERE ${whereClauses.join(" AND ")}
      ORDER BY ci.name ASC NULLS LAST, u.last_name ASC NULLS LAST, u.id ASC
    `,
    params
  );

  return result.rows.map(mapProctor);
}

export async function getProctorById(proctorId: number) {
  const result = await pool.query<ProctorRow>(
    `
      SELECT
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        p.name AS profession_name,
        a.street AS address_street,
        ci.name AS address_city,
        s.code AS address_state,
        a.zip_code AS address_zip_code,
        u.hourly_rate,
        u.minimum_hours,
        u.maximum_hours,
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
      JOIN roles r
        ON r.id = u.role_id
      LEFT JOIN professions p
        ON p.id = u.profession_id
      LEFT JOIN addresses a
        ON a.id = u.proctor_address_id
      LEFT JOIN cities ci
        ON ci.id = a.city_id
      LEFT JOIN states s
        ON s.id = a.state_id
      WHERE u.id = $1
        AND r.name = 'proctor'
        AND u.deleted_at IS NULL
      LIMIT 1
    `,
    [proctorId]
  );

  if (!result.rows[0]) return null;

  const proctor = mapProctor(result.rows[0]);
  const ratingSummary = await getProctorRatings(proctor.id);
  return {
    ...proctor,
    ...ratingSummary,
  };
}

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
      JOIN timezones tz
        ON tz.id = ta.timezone_id
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
