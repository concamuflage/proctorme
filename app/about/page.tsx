import Link from "next/link";
import { SITE_NAME } from "@/lib/proctor";

/**
 * Renders the /about page.
 *
 * @returns The page UI.
 */
export default function AboutPage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:py-16">
        <section className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Interview proctoring
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
              Book a verified proctor for the room where interviews happen.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-700">
              {SITE_NAME} helps interviewers reserve trained proctors for in-person hiring
              sessions, assessments, and panel interviews. Pick the proctoring profile that
              matches the session, choose the location details at checkout, and keep payment
              handled through the existing secure flow.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/proctors"
                className="rounded-full bg-zinc-900 px-5 py-3 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Find proctors
              </Link>
              <Link
                href="/contact"
                className="rounded-full border border-zinc-300 px-5 py-3 text-sm font-medium text-zinc-900 hover:border-zinc-500"
              >
                Contact scheduling
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["Identity checks", "Confirm candidate and interviewer attendance before the session starts."],
              ["Room readiness", "Validate the specified site, seating, device setup, and basic ground rules."],
              ["Live observation", "Monitor the interview room and document session incidents when needed."],
              ["Checkout ready", "Reserve the assignment and pay without changing the existing account flow."],
            ].map(([title, copy]) => (
              <div key={title} className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
                <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-600">{copy}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
