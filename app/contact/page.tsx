"use client";

import { useState } from "react";

/**
 * Builds email for this flow.
 *
 * @returns The result used by the surrounding flow.
 */
function buildEmail() {
  return String.fromCharCode(
    105, 110, 102, 111, 64, 112, 114, 111, 99, 116, 111, 114, 109, 101,
    46, 115, 104, 111, 112
  );
}

/**
 * Renders the /contact page.
 *
 * @returns The page UI.
 */
export default function ContactPage() {
  const [revealed, setRevealed] = useState(false);

  const email = revealed ? buildEmail() : "Click below to reveal our email address.";

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:py-16">
        <h1 className="text-3xl font-semibold tracking-tight">Contact Us</h1>

        <div className="mt-6 max-w-3xl space-y-4 text-base leading-8 text-zinc-700">
          <p>
            If you need help matching a proctor to an interview format, confirming
            location requirements, or updating an existing booking, please reach out by email.
          </p>

          <div className="space-y-3">
            <p>{email}</p>

            <div className="flex flex-wrap gap-3">
              {!revealed ? (
                <button
                  type="button"
                  onClick={() => setRevealed(true)}
                  className="rounded-full bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-800"
                >
                  Reveal Email
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
