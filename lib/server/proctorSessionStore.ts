import pool from "@/lib/server/database/pool";
import { getUserRoles } from "@/lib/server/roleStore";
import { getCachedOrResolvedCityTimeZone } from "@/lib/server/proctorStore";
import { submitProfileChangeRequest } from "@/lib/server/profileChangeRequestStore";

export type ProctorSessionSettings = {
  hourlyRate: number;
  minimumHours: number;
  maximumHours: number;
  address: ProctorAddressSettings;
  addressReviewPending?: boolean;
};

export type ProctorAddressSettings = {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
};

type SessionRow = {
  hourly_rate: unknown;
  minimum_hours: unknown;
  maximum_hours: unknown;
  street: unknown;
  city_name: unknown;
  state_code: unknown;
  zip_code: unknown;
  country_name: unknown;
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
 * Normalizes positive integer into the shape this flow expects.
 *
 * @param value - Input used by normalize positive integer.
 *
 * @returns The normalized value.
 */
function normalizePositiveInteger(value: unknown) {
  const number = toNumber(value);
  return Number.isInteger(number) && number > 0 ? number : null;
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
 * Requires proctor before allowing this flow to continue.
 *
 * @param userId - Input used by require proctor.
 *
 * @returns The result used by the surrounding flow.
 */
async function requireProctor(userId: number) {
  const roles = await getUserRoles(userId);
  if (!roles.some((role) => role.name === "proctor")) {
    throw new Error("Only proctors can update session settings.");
  }
}

/**
 * Runs the map session row logic for this module.
 *
 * @param row - Input used by map session row.
 *
 * @returns The result used by the surrounding flow.
 */
function mapSessionRow(row: SessionRow): ProctorSessionSettings {
  const hourlyRate = normalizePositiveInteger(row.hourly_rate) ?? 0;
  const minimumHours = normalizePositiveInteger(row.minimum_hours) ?? 1;
  const maximumHours = Math.max(minimumHours, normalizePositiveInteger(row.maximum_hours) ?? minimumHours);

  return {
    hourlyRate,
    minimumHours,
    maximumHours,
    address: {
      street: text(row.street),
      city: text(row.city_name),
      state: text(row.state_code),
      zipCode: text(row.zip_code),
      country: text(row.country_name) || "United States",
    },
  };
}

/**
 * Normalizes address into the shape this flow expects.
 *
 * @param value - Input used by normalize address.
 *
 * @returns The normalized value.
 */
function normalizeAddress(value: unknown) {
  const data = typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
  return {
    street: text(data.street),
    city: text(data.city),
    state: text(data.state).toUpperCase(),
    zipCode: text(data.zipCode),
    country: text(data.country) || "United States",
  };
}

/**
 * Runs the upsert address logic for this module.
 *
 * @param client - Input used by upsert address.
 * @param address - Input used by upsert address.
 *
 * @returns The result used by the surrounding flow.
 */
async function upsertAddress(client: typeof pool, address: ProctorAddressSettings) {
  if (!address.street || !address.city || !address.state || !address.zipCode) {
    throw new Error("Full current address is required.");
  }
  if (address.country !== "United States") {
    throw new Error("Only United States addresses are currently supported.");
  }

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
  if (!Number.isInteger(addressId)) throw new Error("Unable to save current address.");

  return addressId;
}

/**
 * Checks whether configured city is true for this flow.
 *
 * @param address - Input used by is configured city.
 *
 * @returns True when the value satisfies the check.
 */
async function isConfiguredCity(address: ProctorAddressSettings) {
  const result = await pool.query<{ exists: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM cities ci
        JOIN states s
          ON s.id = ci.state_id
        JOIN countries co
          ON co.id = s.country_id
        WHERE s.code = $1
          AND co.country = 'United States'
          AND ci.name = $2
      ) AS exists
    `,
    [address.state, address.city]
  );

  return result.rows[0]?.exists === true;
}

/**
 * Runs the timezone id for address logic for this module.
 *
 * @param address - Input used by timezone id for address.
 *
 * @returns The result used by the surrounding flow.
 */
async function timezoneIdForAddress(address: ProctorAddressSettings) {
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

/**
 * Gets proctor session settings for this flow.
 *
 * @param userId - Input used by get proctor session settings.
 *
 * @returns The result used by the surrounding flow.
 */
export async function getProctorSessionSettings(userId: number) {
  await requireProctor(userId);

  const result = await pool.query<SessionRow>(
    `
      SELECT hourly_rate, minimum_hours, maximum_hours
           , a.street, ci.name AS city_name, s.code AS state_code, a.zip_code
           , COALESCE(co.name, co.country, 'United States') AS country_name
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
        AND u.deleted_at IS NULL
      LIMIT 1
    `,
    [userId]
  );

  if (!result.rows[0]) {
    throw new Error("User not found.");
  }

  return mapSessionRow(result.rows[0]);
}

/**
 * Updates proctor session settings while preserving the surrounding form state.
 *
 * @param userId - Input used by update proctor session settings.
 * @param payload - Input used by update proctor session settings.
 *
 * @returns The result used by the surrounding flow.
 */
export async function updateProctorSessionSettings(userId: number, payload: unknown) {
  await requireProctor(userId);

  const data = typeof payload === "object" && payload !== null ? payload as Record<string, unknown> : {};
  const hourlyRate = normalizePositiveInteger(data.hourlyRate);
  const minimumHours = normalizePositiveInteger(data.minimumHours);
  const maximumHours = normalizePositiveInteger(data.maximumHours);
  const address = normalizeAddress(data.address);

  if (!hourlyRate) {
    throw new Error("Hourly rate must be a whole dollar amount greater than zero.");
  }
  if (!minimumHours || !maximumHours || maximumHours < minimumHours) {
    throw new Error("Session hours are invalid.");
  }
  if (!address.street || !address.city || !address.state || !address.zipCode) {
    throw new Error("Full current address is required.");
  }

  if (!(await isConfiguredCity(address))) {
    await submitProfileChangeRequest(userId, "address", address);
    const currentSettings = await getProctorSessionSettings(userId);
    return {
      ...currentSettings,
      addressReviewPending: true,
    };
  }

  const timezoneId = await timezoneIdForAddress(address);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const addressId = await upsertAddress(client, address);
    const result = await client.query<SessionRow>(
      `
        UPDATE users
        SET hourly_rate = $2,
            minimum_hours = $3,
            maximum_hours = $4,
            proctor_address_id = $5,
            timezone_id = COALESCE($6, timezone_id)
        WHERE id = $1
          AND deleted_at IS NULL
        RETURNING hourly_rate, minimum_hours, maximum_hours
      `,
      [userId, hourlyRate, minimumHours, maximumHours, addressId, timezoneId]
    );

    if (!result.rows[0]) {
      throw new Error("User not found.");
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return getProctorSessionSettings(userId);
}
