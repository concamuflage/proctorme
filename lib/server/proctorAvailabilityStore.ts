import pool from "@/lib/server/database/pool";
import { getUserRoles } from "@/lib/server/roleStore";

export type AvailabilityInput = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

type AvailabilityRow = {
  day_of_week: unknown;
  start_time: unknown;
  end_time: unknown;
};

type TimezoneRow = {
  timezone_name: unknown;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value);
}

function normalizeTime(value: unknown) {
  const trimmed = text(value);
  return /^\d{2}:\d{2}$/.test(trimmed) ? trimmed : "";
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function normalizeAvailabilityInput(payload: unknown) {
  const data = typeof payload === "object" && payload !== null ? payload as Record<string, unknown> : {};
  const rows = Array.isArray(data.availability) ? data.availability : [];

  const availability = rows
    .map((item) => (typeof item === "object" && item !== null ? item as Record<string, unknown> : null))
    .filter((item): item is Record<string, unknown> => item !== null)
    .map((item) => ({
      dayOfWeek: toNumber(item.dayOfWeek),
      startTime: normalizeTime(item.startTime),
      endTime: normalizeTime(item.endTime),
    }))
    .filter((item) =>
      Number.isInteger(item.dayOfWeek) &&
      item.dayOfWeek >= 0 &&
      item.dayOfWeek <= 6 &&
      item.startTime &&
      item.endTime &&
      timeToMinutes(item.endTime) > timeToMinutes(item.startTime)
    );

  return { availability };
}

async function getUserTimezone(userId: number) {
  const result = await pool.query<TimezoneRow>(
    `
      SELECT tz.name AS timezone_name
      FROM users u
      LEFT JOIN timezones tz
        ON tz.id = u.timezone_id
      WHERE u.id = $1
      LIMIT 1
    `,
    [userId]
  );
  return text(result.rows[0]?.timezone_name);
}

export async function getProctorAvailabilitySettings(userId: number) {
  const [availabilityResult, userTimezone] = await Promise.all([
    pool.query<AvailabilityRow>(
      `
        SELECT ta.day_of_week, ta.start_time, ta.end_time
        FROM tutor_availability ta
        WHERE ta.user_id = $1
        ORDER BY ta.day_of_week ASC, ta.start_time ASC
      `,
      [userId]
    ),
    getUserTimezone(userId),
  ]);

  const availability = availabilityResult.rows.map((row: AvailabilityRow) => ({
    dayOfWeek: toNumber(row.day_of_week),
    startTime: text(row.start_time).slice(0, 5),
    endTime: text(row.end_time).slice(0, 5),
  }));

  return {
    timezone: userTimezone,
    availability,
  };
}

export async function saveProctorAvailabilitySettings(userId: number, payload: unknown) {
  const roles = await getUserRoles(userId);
  if (!roles.some((role) => role.name === "proctor")) {
    throw new Error("Only proctors can update availability.");
  }

  const input = normalizeAvailabilityInput(payload);
  const timezoneName = await getUserTimezone(userId);
  if (!timezoneName) {
    throw new Error("Set your profile timezone before updating availability.");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM tutor_availability WHERE user_id = $1", [userId]);
    for (const slot of input.availability) {
      await client.query(
        `
          INSERT INTO tutor_availability (user_id, day_of_week, start_time, end_time, created_at, updated_at)
          VALUES ($1, $2, $3::time, $4::time, NOW(), NOW())
        `,
        [userId, slot.dayOfWeek, slot.startTime, slot.endTime]
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return getProctorAvailabilitySettings(userId);
}
