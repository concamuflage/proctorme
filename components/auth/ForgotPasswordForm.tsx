"use client";

import React, { useState } from "react";
import { CLIENT_API_BASE_PATH } from "@/lib/api-base";
import AlertMessage from "@/components/ui/AlertMessage";

/**
 * Renders the forgot password form component.
 *
 * @returns The rendered UI for this component.
 */
export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /**
   * Handles submit for this component.
   *
   * @param event - Input used by handle submit.
   *
   * @returns The result used by the surrounding flow.
   */
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);

    const response = await fetch(`${CLIENT_API_BASE_PATH}/auth/request-password-reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.error ?? "Unable to send password reset email.");
      setLoading(false);
      return;
    }

    setNotice(payload?.message ?? "If that account exists, a password reset email has been sent.");
    setLoading(false);
  };

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
      <h1 className="text-2xl font-semibold">Reset password</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Enter your email address and we will send you a password reset link valid for 30 minutes.
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit} autoComplete="on">
        <div>
          <label className="text-xs font-medium text-zinc-600" htmlFor="forgot-password-email">
            Email
          </label>
          <input
            id="forgot-password-email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm"
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </div>

        {error ? <AlertMessage role="alert" tone="error">{error}</AlertMessage> : null}
        {notice ? <AlertMessage role="status" tone="success">{notice}</AlertMessage> : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-800 disabled:opacity-70"
        >
          {loading ? "Sending..." : "Send reset link"}
        </button>
      </form>
    </div>
  );
}
