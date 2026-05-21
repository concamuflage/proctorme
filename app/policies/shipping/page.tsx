export default function ShippingPolicyPage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:py-16">
        <h1 className="text-3xl font-semibold tracking-tight">Service Areas</h1>

        <div className="mt-6 max-w-3xl space-y-4 text-base leading-8 text-zinc-700">
          <p>
            Proctor bookings are currently intended for interview locations in the United States.
            The exact site address is collected during checkout so the assignment can be matched
            to an appropriate proctoring schedule.
          </p>
          <p>
            Service options shown at checkout represent the available coordination level for the
            specified session, including travel and site-readiness handling where applicable.
          </p>
          <p>
            For unusual facilities, secure buildings, or multi-room interview days, contact us
            before booking so the proctor can be briefed correctly.
          </p>
        </div>
      </main>
    </div>
  );
}
