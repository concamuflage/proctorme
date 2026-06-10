"use client";

import React, { useState } from "react";
import Link from "next/link";
import { CLIENT_API_BASE_PATH } from "@/lib/api-base";
import PasswordInput from "@/components/ui/PasswordInput";
import { PASSWORD_REQUIREMENTS_MESSAGE } from "@/shared/passwordPolicy";

type ResetPasswordFormProps = {
  email: string;
  token: string;
};

/**
 * Renders the reset password form component.
 *
 * @param email, token - Input used by reset password form.
 *
 * @returns The rendered UI for this component.
 */
export default function ResetPasswordForm({ email, token }: ResetPasswordFormProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  /**
   * Handles submit for this component.
   *
   * @param event - Input used by handle submit.
   *
   * @returns The result used by the surrounding flow.
   */
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const response = await fetch(`${CLIENT_API_BASE_PATH}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, token, password }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.error ?? "Unable to reset password.");
      setLoading(false);
      return;
    }

    setDone(true);
    setNotice(payload?.message ?? "Your password has been reset. You can now sign in.");
    setLoading(false);
  };

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
      <h1 className="text-2xl font-semibold">Choose a new password</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Set a new password for <span className="font-medium text-zinc-900">{email}</span>.
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="text-xs font-medium text-zinc-600" htmlFor="reset-password">
            New password
          </label>
          <PasswordInput
            id="reset-password"
            name="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm"
            placeholder="••••••••••••"
            autoComplete="new-password"
            required
          />
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-600" htmlFor="reset-password-confirm">
            Confirm new password
          </label>
          <PasswordInput
            id="reset-password-confirm"
            name="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm"
            placeholder="••••••••••••"
            autoComplete="new-password"
            required
          />
        </div>

        <p className="text-xs text-zinc-500">{PASSWORD_REQUIREMENTS_MESSAGE}</p>

        {error ? <div className="text-xs text-red-600">{error}</div> : null}
        {notice ? <div className="text-xs text-emerald-700">{notice}</div> : null}

        {!done ? (
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-800 disabled:opacity-70"
          >
            {loading ? "Resetting..." : "Reset password"}
          </button>
        ) : (
          <Link
            href="/login"
            className="inline-flex w-full items-center justify-center rounded-full bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-800"
          >
            Go to sign in
          </Link>
        )}
      </form>
    </div>
  );
}
