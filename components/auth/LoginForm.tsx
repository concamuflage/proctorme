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
//   -> NextAuth validates credentials through the Next.js server

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

/**
 * Runs the safe callback url logic for this module.
 *
 * @param value - Input used by safe callback url.
 *
 * @returns The result used by the surrounding flow.
 */
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
  // destrucure the props and set default value for compact to false. compact is used to determine the styling of the form, 
  // whether it should have rounded corners and padding or not. 
  // onSuccess is a callback function that will be called after a successful login,
  // allowing parent components to handle post-login behavior without relying on navigation.
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  // controls the display of a success message after resending verification email.
  //  It is set to a non-null string when a verification email is successfully resent,
  //  which triggers the conditional rendering of the notice message in the UI. 
  // It is reset to null when the user attempts to log in again, 
  // ensuring that old success messages do not persist across login attempts.

  const [notice, setNotice] = useState<string | null>(null);
  // loading is to control the state of the submit button
  // when true, the button is disabled and shows "Signing in..." to indicate that the login process is underway.
  // when false, the button is enabled and shows "Sign in", allowing the user to initiate the login process.
  // controlled by the handleSubmit function, which sets loading to true when the form is submitted 
  // setNotice(null) in handleSubmit;
  // and resets it to false after the authentication attempt is complete (regardless of success or failure).
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

    // Determine where to redirect after login. This is typically the page the user originally wanted to access before being prompted to log in.

    const callbackUrl = searchParams.get("callbackUrl") ?? "/proctors";

    // Ask NextAuth to validate credentials without doing a full redirect.
    // Call NextAuth's credentials provider.
      // This does NOT validate credentials in the browser.
    // Instead, it sends a request to:
    //    /api/auth/callback/credentials
    // which runs the `authorize()` function on the server.
    //
    // redirect: false → prevents automatic page navigation.
    // We want to manually control success/error handling here.
    const result = await signIn("credentials", {
      // These values are sent to the NextAuth server for validation.
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
      setLoading(false);// to enable the submit button when the authentication fails
      return;
    }

    // to enable the submit button when the login is successful
    // For the normal /login page, the user is usually redirected away when login is successful, 
    // so setLoading(false) is not very important visually.
    // the following line is for the modal login.
    // If onSuccess closes the modal or updates parent UI, 
    // clearing loading first avoids leaving the form in a disabled/loading state if the component stays mounted or is reused.
    setLoading(false);

    // if on success callback is provided, call it instead of navigating
    // only used by ModalLoginForm
    if (onSuccess) {
      onSuccess();
      return;
    }

    
    //The expression result?.url ?? callbackUrl uses optional chaining and the nullish coalescing operator:
    // it evaluates to result.url when result exists and result.url is not null or undefined; 
    // otherwise it falls back to callbackUrl. Unlike ||, ?? treats empty strings and other falsy-but-not-nullish values as valid, 
    // so "" would be accepted instead of falling back.


    const destination = safeCallbackUrl(result?.url ?? callbackUrl);
    router.push(`/account/post-login?callbackUrl=${encodeURIComponent(destination)}`);
    router.refresh();
  };

  /**
   * Handles resend verification for this component.
   *
   * @returns The result used by the surrounding flow.
   */
  const handleResendVerification = async () => {
    setResending(true);
    setNotice(null);// Clear any previous notice message before attempting to resend verification email

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
          // It is shown only after the user successfully resends a verification email.
          // handleResendVerification sets the notice state to a success message, which triggers this conditional rendering.
          <div id="login-notice" className="text-xs text-emerald-700">
            {notice} 
          </div>
        ) : null}

        {error === EMAIL_NOT_VERIFIED_MESSAGE ? (
          <button
            type="button"
            onClick={handleResendVerification}
            // Disable this button if:
            // - resending is true
            // OR
            // - email is empty (because the user hasn't provided an email in the form)
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
