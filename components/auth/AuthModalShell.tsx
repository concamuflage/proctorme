// AuthModalShell (client component)
//
// Shared modal wrapper for auth forms.

"use client";

import React from "react";

type AuthModalShellProps = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

/**
 * Shared modal wrapper for auth forms.
 * Handles backdrop, positioning, and open/close transitions.
 */
export default function AuthModalShell({ isOpen, onClose, children }: AuthModalShellProps) {
  if (!isOpen) {
    return null;
  }

  return (
    /* Full-screen overlay container. */
    <div
      className="fixed inset-0 z-50 transition pointer-events-auto"
      aria-hidden={false}
    >
      {/* Backdrop overlay that closes the modal on click. */}
      <div className="absolute inset-0 z-0 bg-black/40 transition-opacity opacity-100" onClick={onClose} />

      {/* Centered modal card container. */}
      <div className="absolute left-1/2 top-4 z-10 w-[95vw] max-w-md -translate-x-1/2 transition opacity-100 sm:top-20 sm:w-[90vw]">
        <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-xl sm:p-6">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 hover:border-zinc-400 hover:text-zinc-900"
              aria-label="Close"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d="M18 6L6 18" />
                <path d="M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mt-4">{children}</div>
        </div>
      </div>
    </div>
  );
}
