const { Client } = require("pg");
const bcrypt = require("bcryptjs");
const { envValue, requiredEnvValue } = require("./testEnv");

function databaseConfig() {
  const connectionString = envValue("TEST_DATABASE_URL") || envValue("DATABASE_URL");
  if (connectionString) return { connectionString };

  return {
    host: requiredEnvValue("PGHOST"),
    port: Number(envValue("PGPORT", "5432")),
    database: requiredEnvValue("PGDATABASE"),
    user: requiredEnvValue("PGUSER"),
    password: requiredEnvValue("PGPASSWORD"),
  };
}

async function withDb(callback) {
  const client = new Client(databaseConfig());
  await client.connect();

  try {
    return await callback(client);
  } finally {
    await client.end();
  }
}

async function seedInstitutionUser(email, password) {
  return withDb(async (client) => {
    const passwordHash = await bcrypt.hash(password, 10);
    const roleResult = await client.query(
      `INSERT INTO roles (name)
       VALUES ('cooporate_user')
       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`
    );

    await client.query("DELETE FROM users WHERE lower(email) = lower($1)", [email]);

    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, email_verified, role_id)
       VALUES ($1, $2, 'Institution', 'Reviewer', TRUE, $3)
       RETURNING id`,
      [email, passwordHash, roleResult.rows[0].id]
    );

    return Number(userResult.rows[0].id);
  });
}

async function seedBooking(proctorUserId, statusName) {
  return withDb(async (client) => {
    const statusResult = await client.query("SELECT id FROM statuses WHERE name = $1 LIMIT 1", [statusName]);
    const statusId = statusResult.rows[0]?.id;
    if (!statusId) throw new Error(`Missing booking status: ${statusName}`);

    const start = new Date();
    start.setDate(start.getDate() - (statusName === "completed" ? 2 : -2));
    start.setHours(10, 0, 0, 0);
    const end = new Date(start);
    end.setHours(11, 0, 0, 0);

    const bookingResult = await client.query(
      `INSERT INTO bookings (user_id, start_time_utc, end_time_utc, status_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [proctorUserId, start, end, statusId]
    );

    return Number(bookingResult.rows[0].id);
  });
}

async function ratingCountForBooking(bookingId) {
  return withDb(async (client) => {
    const result = await client.query(
      `SELECT count(*)::int AS count
       FROM proctor_ratings
       WHERE booking_id = $1`,
      [bookingId]
    );
    return Number(result.rows[0].count);
  });
}

async function cleanupRatingScenario(email, bookingIds) {
  await withDb(async (client) => {
    if (bookingIds.length > 0) {
      await client.query("DELETE FROM proctor_ratings WHERE booking_id = ANY($1::bigint[])", [bookingIds]);
      await client.query("DELETE FROM bookings WHERE id = ANY($1::bigint[])", [bookingIds]);
    }
    await client.query("DELETE FROM users WHERE lower(email) = lower($1)", [email]);
  });
}

module.exports = {
  cleanupRatingScenario,
  ratingCountForBooking,
  seedBooking,
  seedInstitutionUser,
};
