import type { PoolClient } from "pg";
import bcrypt from "bcryptjs";
import { testDbPool } from "../../../support/databasePool";

/**
 * Runs the with db logic for this module.
 *
 * @param callback - Input used by with db.
 *
 * @returns The result used by the surrounding flow.
 */
async function withDb<T>(callback: (client: PoolClient) => Promise<T>) {
  const client = await testDbPool.connect();

  try {
    return await callback(client);
  } finally {
    client.release();
  }
}

/**
 * Runs the seed institution user logic for this module.
 *
 * @param email - Input used by seed institution user.
 * @param password - Input used by seed institution user.
 *
 * @returns The result used by the surrounding flow.
 */
export async function seedInstitutionUser(email: string, password: string) {
  return withDb(async (client) => {
    const passwordHash = await bcrypt.hash(password, 10);
    const roleResult = await client.query<{ id: unknown }>(
      `INSERT INTO roles (name)
       VALUES ('cooporate_user')
       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`
    );

    await client.query("DELETE FROM users WHERE lower(email) = lower($1)", [email]);

    const userResult = await client.query<{ id: unknown }>(
      `INSERT INTO users (email, password_hash, first_name, last_name, email_verified)
       VALUES ($1, $2, 'Institution', 'Reviewer', TRUE)
       RETURNING id`,
      [email, passwordHash]
    );

    const userId = Number(userResult.rows[0].id);
    await client.query(
      `INSERT INTO user_roles (user_id, role_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [userId, roleResult.rows[0].id]
    );

    return userId;
  });
}

/**
 * Runs the seed booking logic for this module.
 *
 * @param proctorUserId - Input used by seed booking.
 * @param statusName - Input used by seed booking.
 *
 * @returns The result used by the surrounding flow.
 */
export async function seedBooking(proctorUserId: number, statusName: string) {
  return withDb(async (client) => {
    const statusResult = await client.query<{ id: unknown }>("SELECT id FROM statuses WHERE name = $1 LIMIT 1", [statusName]);
    const statusId = statusResult.rows[0]?.id;
    if (!statusId) throw new Error(`Missing booking status: ${statusName}`);

    const start = new Date();
    start.setDate(start.getDate() - (statusName === "completed" ? 2 : -2));
    start.setHours(10, 0, 0, 0);
    const end = new Date(start);
    end.setHours(11, 0, 0, 0);

    const bookingResult = await client.query<{ id: unknown }>(
      `INSERT INTO bookings (user_id, start_time_utc, end_time_utc, status_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [proctorUserId, start, end, statusId]
    );

    return Number(bookingResult.rows[0].id);
  });
}

/**
 * Runs the rating count for booking logic for this module.
 *
 * @param bookingId - Input used by rating count for booking.
 *
 * @returns The result used by the surrounding flow.
 */
export async function ratingCountForBooking(bookingId: number) {
  return withDb(async (client) => {
    const result = await client.query<{ count: unknown }>(
      `SELECT count(*)::int AS count
       FROM proctor_ratings
       WHERE booking_id = $1`,
      [bookingId]
    );
    return Number(result.rows[0].count);
  });
}

/**
 * Runs the cleanup rating scenario logic for this module.
 *
 * @param email - Input used by cleanup rating scenario.
 * @param bookingIds - Input used by cleanup rating scenario.
 *
 * @returns The result used by the surrounding flow.
 */
export async function cleanupRatingScenario(email: string, bookingIds: number[]) {
  await withDb(async (client) => {
    if (bookingIds.length > 0) {
      await client.query("DELETE FROM proctor_ratings WHERE booking_id = ANY($1::bigint[])", [bookingIds]);
      await client.query("DELETE FROM bookings WHERE id = ANY($1::bigint[])", [bookingIds]);
    }
    await client.query("DELETE FROM users WHERE lower(email) = lower($1)", [email]);
  });
}
