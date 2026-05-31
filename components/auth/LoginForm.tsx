// LoginForm (client component)
//
// This component renders the login form UI and handles
// client-side form state and submission.
//
// IMPORTANT ARCHITECTURE NOTE:
// - This component runs in the BROWSER.
// - It does NOT authenticate users directly.
// - It delegates authentication to NextAuth via `signIn("credentials")`.
//
// Auth flow:
// User submits form
//   -> signIn("credentials")
//   -> NextAuth API route (/api/auth/*)
//   -> authorize() runs on the NextAuth server
//   -> backend server validates credentials

"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { CLIENT_API_BASE_PATH } from "@/lib/api-base";
import PasswordInput from "@/components/ui/PasswordInput";

type LoginFormProps = {
  onSuccess?: () => void;
  compact?: boolean;
};

const EMAIL_NOT_VERIFIED_MESSAGE = "Please verify your email before signing in.";

function safeCallbackUrl(value: string | null | undefined) {
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

/**
 * Login form UI and client-side submission handler.
 * Delegates auth to NextAuth credentials provider.
 */
export default function LoginForm({ onSuccess, compact = false }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  /**
   * Submit handler for the login form.
   * Prevents full-page reload and calls NextAuth.
   */
  // Handles form submission when user clicks "Sign in"
  const handleSubmit = async (event: React.FormEvent) => {
    // Prevents the browser from doing a full page reload
    // (default HTML form behavior)
    event.preventDefault();

    // Turn on loading state to disable button and show spinner text
    setLoading(true);

    // Clear any previous error message before attempting login
    setError(null);
    setNotice(null);

    const callbackUrl = searchParams.get("callbackUrl") ?? "/proctors";

    // Ask NextAuth to validate credentials without doing a full redirect.
    // Call NextAuth's credentials provider.
    // This does NOT talk directly to your backend.
    // Instead, it sends a request to:
    //    /api/auth/callback/credentials
    // which runs the `authorize()` function on the server.
    //
    // redirect: false → prevents automatic page navigation.
    // We want to manually control success/error handling here.
    const result = await signIn("credentials", {
      // These values are sent to the NextAuth server,
      // which then forwards them to your backend for validation.
      email,
      password,
      callbackUrl,

      // Disable automatic redirect so we can check `result.error`
      // and display custom UI feedback.
      redirect: false,
    });

    if (result?.error) {
      const decodedError = decodeURIComponent(result.error);
      setError(decodedError || "Invalid email or password.");
      setLoading(false);
      return;
    }

    setLoading(false);
    if (onSuccess) {
      onSuccess();
      return;
    }

    const destination = safeCallbackUrl(result?.url ?? callbackUrl);
    router.push(`/account/post-login?callbackUrl=${encodeURIComponent(destination)}`);
    router.refresh();
  };

  const handleResendVerification = async () => {
    setResending(true);
    setNotice(null);

    const response = await fetch(`${CLIENT_API_BASE_PATH}/auth/resend-verification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.error ?? "Unable to resend verification email.");
      setResending(false);
      return;
    }

    setNotice(payload?.message ?? "Verification email sent.");
    setResending(false);
  };

  return (
    /*
      Root container. The `compact` flag is used when the form is embedded
      inside a modal that already has a padded card background.
    */
    <div className={compact ? "" : "rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8"}>
      <h1 className={compact ? "text-base font-semibold" : "text-2xl font-semibold"}>
        Welcome back
      </h1>
      <p className="mt-2 text-sm text-zinc-600">Sign in with email</p>

      {/* Main form. autoComplete keeps browser password managers happy. */}
      <form className="mt-6 space-y-4" onSubmit={handleSubmit} autoComplete="on">
        <div>
          <label className="text-xs font-medium text-zinc-600" htmlFor="login-email">
            Email
          </label>
          <input
            id="login-email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm"
            placeholder="you@example.com"
            autoComplete="username"
            required
          />
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-600" htmlFor="login-password">
            Password
          </label>
          <PasswordInput
            id="login-password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm"
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
          <div className="mt-2 text-right">
            <a href="/forgot-password" className="text-xs text-zinc-700 underline">
              Forgot password?
            </a>
          </div>
        </div>

        {error ? (
          <div id="login-error" className="text-xs text-red-600">
            {error}
          </div>
        ) : null}
        {notice ? (
          <div id="login-notice" className="text-xs text-emerald-700">
            {notice}
          </div>
        ) : null}

        {error === EMAIL_NOT_VERIFIED_MESSAGE ? (
          <button
            type="button"
            onClick={handleResendVerification}
            disabled={resending || !email}
            className="text-left text-xs text-zinc-700 underline disabled:opacity-50"
          >
            {resending ? "Sending verification email..." : "Resend verification email"}
          </button>
        ) : null}

        <button
          id="login-submit"
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-800 disabled:opacity-70"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
