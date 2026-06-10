"use client";

import React, { useState } from "react";

type PasswordInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

/**
 * Renders the password input component.
 *
 * @param className = "", ...props - Input used by password input.
 *
 * @returns The rendered UI for this component.
 */
export default function PasswordInput({ className = "", ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const buttonLabel = visible ? "Hide password" : "Show password";

  return (
    <div className="relative mt-2">
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={`${className} pr-11`}
      />
      <button
        type="button"
        aria-label={buttonLabel}
        aria-pressed={visible}
        title={buttonLabel}
        onClick={() => setVisible((current) => !current)}
        className="absolute right-3 top-1/2 z-10 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-300"
      >
        {visible ? (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3l18 18" />
            <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
            <path d="M9.9 4.2A9.8 9.8 0 0 1 12 4c5 0 8.7 4.1 10 8a12 12 0 0 1-2.1 3.6" />
            <path d="M6.2 6.2A12 12 0 0 0 2 12c1.3 3.9 5 8 10 8 1.4 0 2.8-.3 4-.9" />
          </svg>
        ) : (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3.7-8 10-8 10 8 10 8-3.7 8-10 8S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
