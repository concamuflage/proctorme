import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserIdByEmail } from "@/lib/server/profileStore";
import { getUserRoles } from "@/lib/server/roleStore";

// Resolves the currently authenticated user's database ID.
// Tries the session user.id first, then falls back to looking up the user by email.
// Returns null when no authenticated session exists.
/**
 * Resolves session user id from the available session or request context.
 *
 * @returns The result used by the surrounding flow.
 */
export async function resolveSessionUserId() {
  const session = await getServerSession(authOptions);
  // No logged-in user found in the session.
  if (!session?.user) return null;
  // Use the user ID already stored in the session.
  if (session.user.id) return Number(session.user.id);
  // Fall back to a database lookup using the user's email address.
  if (session.user.email) return getUserIdByEmail(session.user.email);
  // Unable to determine a user ID.
  return null;
}

// Returns the authenticated user's ID only if the user has the admin role.
// Returns null for unauthenticated or non-admin users.
/**
 * Requires admin user id before allowing this flow to continue.
 *
 * @returns The result used by the surrounding flow.
 */
export async function requireAdminUserId() {
  // Resolve the current user's ID from the session.
  const userId = await resolveSessionUserId();
  // No authenticated user.
  if (!userId) return null;
  // Load all roles assigned to the user.
  const roles = await getUserRoles(userId);
  // Allow access only when the user has the admin role.
  return roles.some((role) => role.name === "admin") ? userId : null;
}
