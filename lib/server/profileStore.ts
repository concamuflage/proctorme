import pool from "@/backend/database/pool";

type ProfileData = {
  user: {
    id: number;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
};

function toNumber(value: unknown) {
  return typeof value === "number" ? value : Number(value);
}

function trimText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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

  const user = userResult.rows[0];

  return {
    user: {
      id: toNumber(user.id),
      email: trimText(user.email),
      firstName: user.first_name ? trimText(user.first_name) : null,
      lastName: user.last_name ? trimText(user.last_name) : null,
    },
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
