export default function ShippingPolicyPage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14 lg:py-16">
        <h1 className="text-3xl font-semibold tracking-tight">Shipping</h1>

        <div className="mt-6 max-w-3xl space-y-4 text-base leading-8 text-zinc-700">
          <p>
            Standard air mail to the U.S. takes about two weeks for delivery.
            Please do not place an order if you are located outside the United States.
          </p>
          <p>
            All items are sourced in China and have tags in Chinese only.
          </p>
          <p>
            All clothing is guaranteed to be authentic and not counterfeit.
          </p>
        </div>
      </main>
    </div>
  );
}
