"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

function safeCallbackUrl(value: string | null) {
  if (!value) return "/proctors";
  if (value.startsWith("/") && !value.startsWith("//")) return value;

  try {
    const parsed = new URL(value, window.location.origin);
    if (parsed.origin !== window.location.origin) return "/proctors";
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/proctors";
  }
}

function PostLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const [message, setMessage] = useState("Checking your account...");

  useEffect(() => {
    const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"));

    if (status === "loading") return;
    if (status !== "authenticated") {
      router.replace(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      return;
    }

    let cancelled = false;

    async function routeAfterLogin() {
      setMessage("Checking your account...");
      const response = await fetch("/api/account/roles", { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (cancelled) return;

      if (response.ok && payload?.hasRoles === false) {
        router.replace(payload?.hasProctorApplication === true ? "/account/proctor-verification" : "/account/role-choice");
        return;
      }

      if (response.ok && Array.isArray(payload?.roles) && payload.roles.some((role: { name?: unknown }) => role.name === "admin")) {
        router.replace("/admin");
        return;
      }

      router.replace(callbackUrl);
    }

    routeAfterLogin().catch(() => {
      if (!cancelled) {
        setMessage("Unable to check roles. Continuing...");
        router.replace(callbackUrl);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [router, searchParams, status]);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="mx-auto flex max-w-6xl justify-center px-4 py-10 sm:px-6 sm:py-16">
        <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 shadow-sm sm:p-8">
          {message}
        </div>
      </main>
    </div>
  );
}

export default function PostLoginPage() {
  return (
    <Suspense fallback={null}>
      <PostLoginContent />
    </Suspense>
  );
}
