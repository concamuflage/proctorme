"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

/**
 * Renders the /account/role-choice page.
 *
 * @returns The page UI.
 */
export default function RoleChoicePage() {
  const router = useRouter();
  const { status } = useSession();
  const [checkingRoles, setCheckingRoles] = useState(true);

  useEffect(() => {
    if (status === "loading") return;
    if (status !== "authenticated") {
      router.replace(`/login?callbackUrl=${encodeURIComponent("/account/role-choice")}`);
      return;
    }

    let cancelled = false;

    /**
     * Runs the check roles logic for this module.
     *
     * @returns The result used by the surrounding flow.
     */
    async function checkRoles() {
      setCheckingRoles(true);
      const response = await fetch("/api/account/roles", { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (cancelled) return;
      if (response.ok && payload?.hasRoles === true) {
        router.replace("/proctors");
        return;
      }
      setCheckingRoles(false);
    }

    checkRoles().catch(() => {
      if (!cancelled) setCheckingRoles(false);
    });

    return () => {
      cancelled = true;
    };
  }, [router, status]);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="mx-auto flex max-w-6xl justify-center px-4 py-10 sm:px-6 sm:py-16">
        <section className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          {checkingRoles ? (
            <p className="text-sm text-zinc-600">Checking your account...</p>
          ) : (
            <>
              <h1 className="text-2xl font-semibold">What do you want to do?</h1>
              <div className="mt-6 grid gap-3">
                <Link
                  href="/account/corporate-verification"
                  className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-900 hover:border-zinc-400"
                >
                  Book a proctor
                </Link>
                <Link
                  href="/account/proctor-verification"
                  className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-900 hover:border-zinc-400"
                >
                  Become a proctor
                </Link>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
