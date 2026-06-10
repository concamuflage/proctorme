import pool from "@/lib/server/database/pool";

export type AccountRoleIntent = "proctor" | "corporate";
export type UserRole = {
  id: number;
  name: string;
};

type RoleRow = {
  id: unknown;
  name: unknown;
};

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
 * Runs the role names for intent logic for this module.
 *
 * @param intent - Input used by role names for intent.
 *
 * @returns The result used by the surrounding flow.
 */
function roleNamesForIntent(intent: AccountRoleIntent) {
  if (intent === "proctor") return ["proctor"];
  return ["corporate_user", "cooporate_user", "interviewee"];
}

/**
 * Runs the add user role logic for this module.
 *
 * @param userId - Input used by add user role.
 * @param intent - Input used by add user role.
 *
 * @returns The result used by the surrounding flow.
 */
export async function addUserRole(userId: number, intent: AccountRoleIntent) {
  const roleResult = await pool.query<RoleRow>(
    `
      SELECT id, name
      FROM roles
      WHERE name = ANY($1::text[])
      ORDER BY array_position($1::text[], name)
      LIMIT 1
    `,
    [roleNamesForIntent(intent)]
  );

  const role = roleResult.rows[0];
  if (!role) {
    throw new Error(`Missing role for ${intent}.`);
  }

  await pool.query(
    `
      INSERT INTO user_roles (user_id, role_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `,
    [userId, toNumber(role.id)]
  );

  return {
    id: toNumber(role.id),
    name: text(role.name),
  };
}

/**
 * Gets user roles for this flow.
 *
 * @param userId - Input used by get user roles.
 *
 * @returns The result used by the surrounding flow.
 */
export async function getUserRoles(userId: number): Promise<UserRole[]> {
  const result = await pool.query<RoleRow>(
    `
      SELECT r.id, r.name
      FROM user_roles ur
      JOIN roles r
        ON r.id = ur.role_id
      WHERE ur.user_id = $1
      ORDER BY r.name ASC
    `,
    [userId]
  );

  return result.rows.map((row: RoleRow) => ({
    id: toNumber(row.id),
    name: text(row.name),
  }));
}

/**
 * Runs the has user roles logic for this module.
 *
 * @param userId - Input used by has user roles.
 *
 * @returns The result used by the surrounding flow.
 */
export async function hasUserRoles(userId: number) {
  const result = await pool.query<{ exists: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM user_roles
        WHERE user_id = $1
      ) AS exists
    `,
    [userId]
  );

  return result.rows[0]?.exists === true;
}
