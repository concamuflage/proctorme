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

function mapProctor(row) {
  const minimumHours = Number(row.minimum_hours || 1);
  const maximumHours = Math.max(minimumHours, Number(row.maximum_hours || minimumHours));
  const sessionWindow =
    minimumHours === maximumHours ? `${minimumHours} hr` : `${minimumHours}-${maximumHours} hr`;
  const profession = row.profession_name || "Interview Proctor";

  return {
    id: toNumber(row.id),
    name: fullName(row),
    email: row.email,
    credential: "Verified proctor",
    specialty: profession,
    profession,
    address: row.address_street || "",
    city: row.address_city || "",
    state: row.address_state || "",
    zipCode: row.address_zip_code || "",
    formattedAddress: formatAddress(row),
    sessionWindow,
    rateUsd: row.hourly_rate == null ? null : toNumber(row.hourly_rate),
    hourlyRate: row.hourly_rate == null ? null : toNumber(row.hourly_rate),
    minimumHours,
    maximumHours,
    imageUrls: Array.isArray(row.image_urls) ? row.image_urls.filter(Boolean) : [],
    bio: `${fullName(row)} is available for ${String(profession).toLowerCase()} assignments at the selected location.`,
    slotsAvailable: 8,
  };
}

async function queryProctors({ id } = {}) {
  const params = [];
  const filters = ["r.name = 'proctor'", "u.deleted_at IS NULL"];

  if (id != null) {
    params.push(id);
    filters.push(`u.id = $${params.length}`);
  }

  const result = await pool.query(
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
      WHERE ${filters.join(" AND ")}
      ORDER BY ci.name ASC NULLS LAST, u.last_name ASC NULLS LAST, u.id ASC
    `,
    params
  );

  return result.rows.map(mapProctor);
}

exports.getProctorById = async (req, res) => {
  try {
    const proctors = await queryProctors({ id: Number(req.params.id) });
    if (proctors.length === 0) {
      return res.status(404).json({ error: "Proctor not found" });
    }

    return res.json(proctors[0]);
  } catch (err) {
    console.error("getProctorById error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

exports.getAllProctors = async (_req, res) => {
  try {
    const proctors = await queryProctors();
    return res.json(proctors);
  } catch (err) {
    console.error("getAllProctors error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
