import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdminUserId } from "@/lib/server/sessionUser";

export default async function AdminDashboardPage() {
  const adminUserId = await requireAdminUserId();
  if (!adminUserId) {
    redirect("/login?callbackUrl=/admin");
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
        <h1 className="text-2xl font-semibold">Admin dashboard</h1>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/admin/proctor-applications"
            className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm hover:border-zinc-400"
          >
            <div className="text-base font-semibold text-zinc-950">Proctor applications</div>
            <div className="mt-2 text-sm leading-6 text-zinc-600">
              Review submitted proctor verification materials.
            </div>
          </Link>
          <Link
            href="/admin/profile-change-requests"
            className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm hover:border-zinc-400"
          >
            <div className="text-base font-semibold text-zinc-950">Profile change requests</div>
            <div className="mt-2 text-sm leading-6 text-zinc-600">
              Review post-approval profile changes that need verification.
            </div>
          </Link>
          <Link
            href="/admin/organization-applications"
            className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm hover:border-zinc-400"
          >
            <div className="text-base font-semibold text-zinc-950">Organization applications</div>
            <div className="mt-2 text-sm leading-6 text-zinc-600">
              Review requests to become verified organization users.
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
