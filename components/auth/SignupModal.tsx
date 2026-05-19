// SignupModal (client component)
//
// This component renders a modal wrapper around <SignupForm />.

"use client";

import React from "react";
import SignupForm from "@/components/auth/SignupForm";
import AuthModalShell from "@/components/auth/AuthModalShell";

type SignupModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin?: () => void;
};

/**
 * Signup modal wrapper that renders the signup form inside the shared shell.
 */
export default function SignupModal({ isOpen, onClose, onSwitchToLogin }: SignupModalProps) {
  return (
    <AuthModalShell isOpen={isOpen} onClose={onClose}>
      {/* Main signup form content. */}
      <SignupForm compact />
      {/* Optional switch link so this modal can be used standalone. */}
      {onSwitchToLogin ? (
        <div className="mt-4 text-center text-xs text-zinc-600">
          Already have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-zinc-900 underline"
          >
            Sign in
          </button>
        </div>
      ) : null}
    </AuthModalShell>
  );
}
