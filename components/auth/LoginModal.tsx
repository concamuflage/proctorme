// LoginModal (client component)
//
// This component renders a modal wrapper around <LoginForm />.
// It is a CLIENT component because it uses browser-only event handlers.
//
// Responsibilities:
// - Control modal open/close behavior
// - Handle UI transitions and backdrop (via AuthModalShell)
//
// NOTE:
// Actual authentication logic does NOT live here.
// This component only collects user input and delegates
// auth handling to NextAuth via <LoginForm />.

"use client";

import React from "react";
import LoginForm from "@/components/auth/LoginForm";
import AuthModalShell from "@/components/auth/AuthModalShell";

type LoginModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToSignup?: () => void;
  onSuccess?: () => void;
};

/**
 * Login modal wrapper that renders the login form inside the shared shell.
 */
export default function LoginModal({ isOpen, onClose, onSwitchToSignup, onSuccess }: LoginModalProps) {
  return (
    <AuthModalShell isOpen={isOpen} onClose={onClose}>
      {/* Main login form content. */}
      <LoginForm compact onSuccess={onSuccess ?? onClose} />
      {/* Optional switch link so this modal can be used standalone. */}
      {onSwitchToSignup ? (
        <div className="mt-4 text-center text-xs text-zinc-600">
          New here?{" "}
          <button
            type="button"
            onClick={onSwitchToSignup}
            className="text-zinc-900 underline"
          >
            Create an account
          </button>
        </div>
      ) : null}
    </AuthModalShell>
  );
}
