/**
 * Renders the /policies/returns page.
 *
 * @returns The page UI.
 */
export default function ReturnsPolicyPage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:py-16">
        <h1 className="text-3xl font-semibold tracking-tight">Cancellations</h1>

        <div className="mt-6 max-w-3xl space-y-4 text-base leading-8 text-zinc-700">
          <p>
            If a booking no longer fits your interview schedule, contact us as soon as possible
            so we can update or cancel the assignment before the proctor is dispatched.
          </p>
          <p>
            Completed or same-day services may not be refundable once the proctor has prepared
            for or arrived at the specified location.
          </p>
          <p>
            When a refund is approved, it is processed back through the original payment method.
          </p>
          <p>
            If a site is inaccessible, missing required permissions, or materially different
            from the checkout details, rescheduling fees may apply.
          </p>
        </div>
      </main>
    </div>
  );
}
