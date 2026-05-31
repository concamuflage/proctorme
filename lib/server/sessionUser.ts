import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserIdByEmail } from "@/lib/server/profileStore";
import { getUserRoles } from "@/lib/server/roleStore";

export async function resolveSessionUserId() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  if (session.user.id) return Number(session.user.id);
  if (session.user.email) return getUserIdByEmail(session.user.email);
  return null;
}

export async function requireAdminUserId() {
  const userId = await resolveSessionUserId();
  if (!userId) return null;
  const roles = await getUserRoles(userId);
  return roles.some((role) => role.name === "admin") ? userId : null;
}
