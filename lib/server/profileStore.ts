import pool from "@/backend/database/pool";

type MeasurementRecord = {
  id: number;
  heightCm: number | null;
  chestCm: number | null;
  shoulderWidthCm: number | null;
  sleeveLengthCm: number | null;
  waistCm: number | null;
  hipCm: number | null;
  inseamCm: number | null;
};

type AddressRecord = {
  id: number;
  name: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
  isDefault: boolean;
  addressType: "shipping" | "billing";
};

type ProfileData = {
  user: {
    id: number;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  measurement: MeasurementRecord | null;
  shippingAddresses: AddressRecord[];
  billingAddresses: AddressRecord[];
};

function toNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value);
}

function trimText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function mapMeasurement(row: Record<string, unknown>): MeasurementRecord {
  return {
    id: toNumber(row.id),
    heightCm: row.height_cm == null ? null : toNumber(row.height_cm),
    chestCm: row.chest_cm == null ? null : toNumber(row.chest_cm),
    shoulderWidthCm: row.shoulder_width_cm == null ? null : toNumber(row.shoulder_width_cm),
    sleeveLengthCm: row.sleeve_length_cm == null ? null : toNumber(row.sleeve_length_cm),
    waistCm: row.waist_cm == null ? null : toNumber(row.waist_cm),
    hipCm: row.hip_cm == null ? null : toNumber(row.hip_cm),
    inseamCm: row.inseam_cm == null ? null : toNumber(row.inseam_cm),
  };
}

function mapAddress(row: Record<string, unknown>): AddressRecord {
  return {
    id: toNumber(row.id),
    name: trimText(row.name),
    street: trimText(row.street),
    city: trimText(row.city),
    state: trimText(row.state),
    zipCode: trimText(row.zip_code),
    country: trimText(row.country),
    phone: trimText(row.phone),
    isDefault: Boolean(row.is_default),
    addressType: trimText(row.address_type) === "billing" ? "billing" : "shipping",
  };
}

export async function getProfile(userId: number): Promise<ProfileData> {
  const userResult = await pool.query(
    `
      SELECT id, email, first_name, last_name
      FROM users
      WHERE id = $1
    `,
    [userId]
  );

  if (userResult.rows.length === 0) {
    throw new Error("User not found.");
  }

  const measurementResult = await pool.query(
    `
      SELECT m.id,
             m.height_cm,
             m.chest_cm,
             m.shoulder_width_cm,
             m.sleeve_length_cm,
             m.waist_cm,
             m.hip_cm,
             m.inseam_cm
      FROM user_measurement um
      JOIN measurements m ON m.id = um.measurement_id
      WHERE um.user_id = $1
      ORDER BY um.is_default DESC, m.id DESC
      LIMIT 1
    `,
    [userId]
  );

  const addressResult = await pool.query(
    `
      SELECT
        a.id,
        a.name,
        a.street,
        a.city,
        a.state,
        a.zip_code,
        a.country,
        a.phone,
        ua.is_default,
        ua.address_type
      FROM user_addresses ua
      JOIN addresses a ON a.id = ua.address_id
      WHERE ua.user_id = $1
      ORDER BY ua.address_type ASC, ua.is_default DESC, a.id ASC
    `,
    [userId]
  );

  const addresses: AddressRecord[] = addressResult.rows.map(mapAddress);

  return {
    user: {
      id: toNumber(userResult.rows[0].id),
      email: trimText(userResult.rows[0].email),
      firstName: userResult.rows[0].first_name ? trimText(userResult.rows[0].first_name) : null,
      lastName: userResult.rows[0].last_name ? trimText(userResult.rows[0].last_name) : null,
    },
    measurement: measurementResult.rows[0] ? mapMeasurement(measurementResult.rows[0]) : null,
    shippingAddresses: addresses
      .filter((address: AddressRecord) => address.addressType === "shipping")
      .slice(0, 2),
    billingAddresses: addresses.filter((address: AddressRecord) => address.addressType === "billing"),
  };
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

export async function saveMeasurement(
  userId: number,
  measurement: {
    heightCm: number | null;
    chestCm: number | null;
    shoulderWidthCm: number | null;
    sleeveLengthCm: number | null;
    waistCm: number | null;
    hipCm: number | null;
    inseamCm: number | null;
  }
) {
  const existingResult = await pool.query(
    `
      SELECT m.id
      FROM user_measurement um
      JOIN measurements m ON m.id = um.measurement_id
      WHERE um.user_id = $1
      ORDER BY um.is_default DESC, m.id DESC
      LIMIT 1
    `,
    [userId]
  );

  if (existingResult.rows[0]?.id) {
    await pool.query(
      `
        UPDATE measurements
        SET height_cm = $2,
            chest_cm = $3,
            shoulder_width_cm = $4,
            sleeve_length_cm = $5,
            waist_cm = $6,
            hip_cm = $7,
            inseam_cm = $8
        WHERE id = $1
      `,
      [
        existingResult.rows[0].id,
        measurement.heightCm,
        measurement.chestCm,
        measurement.shoulderWidthCm,
        measurement.sleeveLengthCm,
        measurement.waistCm,
        measurement.hipCm,
        measurement.inseamCm,
      ]
    );
    return;
  }

  const insertedMeasurement = await pool.query(
    `
      INSERT INTO measurements (height_cm, chest_cm, shoulder_width_cm, sleeve_length_cm, waist_cm, hip_cm, inseam_cm)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `,
    [
      measurement.heightCm,
      measurement.chestCm,
      measurement.shoulderWidthCm,
      measurement.sleeveLengthCm,
      measurement.waistCm,
      measurement.hipCm,
      measurement.inseamCm,
    ]
  );

  await pool.query(
    `
      INSERT INTO user_measurement (user_id, measurement_id, is_default)
      VALUES ($1, $2, TRUE)
    `,
    [userId, insertedMeasurement.rows[0].id]
  );
}

export async function updateAddress(
  userId: number,
  addressId: number,
  address: {
    name: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    phone: string;
  }
) {
  const ownershipResult = await pool.query(
    `
      SELECT 1
      FROM user_addresses
      WHERE user_id = $1 AND address_id = $2
      LIMIT 1
    `,
    [userId, addressId]
  );

  if (ownershipResult.rows.length === 0) {
    throw new Error("Address not found.");
  }

  await pool.query(
    `
      UPDATE addresses
      SET name = $2,
          street = $3,
          city = $4,
          state = $5,
          zip_code = $6,
          country = $7,
          phone = $8
      WHERE id = $1
    `,
    [
      addressId,
      address.name,
      address.street,
      address.city,
      address.state,
      address.zipCode,
      address.country,
      address.phone,
    ]
  );
}

export async function deleteAddress(userId: number, addressId: number) {
  const ownershipResult = await pool.query(
    `
      SELECT is_default, address_type
      FROM user_addresses
      WHERE user_id = $1 AND address_id = $2
      LIMIT 1
    `,
    [userId, addressId]
  );

  if (ownershipResult.rows.length === 0) {
    throw new Error("Address not found.");
  }

  const deletedAddressWasDefault = Boolean(ownershipResult.rows[0].is_default);
  const deletedAddressType = trimText(ownershipResult.rows[0].address_type);

  await pool.query(
    `
      DELETE FROM user_addresses
      WHERE user_id = $1 AND address_id = $2
    `,
    [userId, addressId]
  );

  await pool.query(
    `
      DELETE FROM addresses
      WHERE id = $1
    `,
    [addressId]
  );

  if (deletedAddressWasDefault && deletedAddressType) {
    const replacementResult = await pool.query(
      `
        SELECT address_id
        FROM user_addresses
        WHERE user_id = $1 AND address_type = $2
        ORDER BY address_id ASC
        LIMIT 1
      `,
      [userId, deletedAddressType]
    );

    if (replacementResult.rows.length > 0) {
      await pool.query(
        `
          UPDATE user_addresses
          SET is_default = TRUE
          WHERE user_id = $1
            AND address_type = $2
            AND address_id = $3
        `,
        [userId, deletedAddressType, replacementResult.rows[0].address_id]
      );
    }
  }
}

export async function copyDefaultShippingAddressToBilling(userId: number) {
  const existingBillingResult = await pool.query(
    `
      SELECT 1
      FROM user_addresses
      WHERE user_id = $1 AND address_type = 'billing'
      LIMIT 1
    `,
    [userId]
  );

  if (existingBillingResult.rows.length > 0) {
    throw new Error("Billing address already exists.");
  }

  const shippingResult = await pool.query(
    `
      SELECT
        a.name,
        a.street,
        a.city,
        a.state,
        a.zip_code,
        a.country,
        a.phone
      FROM user_addresses ua
      JOIN addresses a ON a.id = ua.address_id
      WHERE ua.user_id = $1 AND ua.address_type = 'shipping'
      ORDER BY ua.is_default DESC, ua.address_id ASC
      LIMIT 1
    `,
    [userId]
  );

  if (shippingResult.rows.length === 0) {
    throw new Error("Add a shipping address first or enter a separate billing address.");
  }

  const shippingAddress = shippingResult.rows[0];
  await saveAddress(userId, "billing", {
    name: trimText(shippingAddress.name),
    street: trimText(shippingAddress.street),
    city: trimText(shippingAddress.city),
    state: trimText(shippingAddress.state),
    zipCode: trimText(shippingAddress.zip_code),
    country: trimText(shippingAddress.country),
    phone: trimText(shippingAddress.phone),
  });
}

export async function saveAddress(
  userId: number,
  addressType: "shipping" | "billing",
  address: {
    name: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    phone: string;
  }
) {
  const existingCount = await pool.query(
    `
      SELECT COUNT(*) AS total
      FROM user_addresses
      WHERE user_id = $1 AND address_type = $2
    `,
    [userId, addressType]
  );

  const existingTotal = toNumber(existingCount.rows[0]?.total ?? 0);
  if (addressType === "shipping" && existingTotal >= 2) {
    throw new Error("You can only save up to two shipping addresses.");
  }

  const insertedAddress = await pool.query(
    `
      INSERT INTO addresses (name, street, city, state, zip_code, country, phone)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `,
    [
      address.name,
      address.street,
      address.city,
      address.state,
      address.zipCode,
      address.country,
      address.phone,
    ]
  );

  await pool.query(
    `
      INSERT INTO user_addresses (user_id, address_id, is_default, address_type)
      VALUES ($1, $2, $3, $4)
    `,
    [userId, insertedAddress.rows[0].id, existingTotal === 0, addressType]
  );
}
