"use client";

import React from "react";
import { formatUsd } from "@/lib/formatters";
import { calculateBookingTotal, calculateServiceFee, SERVICE_FEE_RATE } from "@/lib/serviceFee";

type OrderSummaryProps = {
  subtotal: number;
  testIdPrefix?: string;
  legacySubtotalTestId?: string;
  title?: string;
};

/**
 * Renders the order summary component.
 *
 * @param subtotal,
  testIdPrefix,
  legacySubtotalTestId,
  title = "Booking summary", - Input used by order summary.
 *
 * @returns The rendered UI for this component.
 */
export default function OrderSummary({
  subtotal,
  testIdPrefix,
  legacySubtotalTestId,
  title = "Booking summary",
}: OrderSummaryProps) {
  const serviceFee = calculateServiceFee(subtotal);
  const bookingTotal = calculateBookingTotal(subtotal);

  return (
    <>
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-zinc-600">Session subtotal</span>
        <span
          data-testid={testIdPrefix ? `${testIdPrefix}-summary-subtotal` : undefined}
          className="font-semibold text-zinc-900"
        >
          {legacySubtotalTestId ? (
            <span data-testid={legacySubtotalTestId}>{formatUsd(subtotal, 2)}</span>
          ) : (
            formatUsd(subtotal, 2)
          )}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-zinc-600">Service fee ({Math.round(SERVICE_FEE_RATE * 100)}%)</span>
        <span data-testid={testIdPrefix ? `${testIdPrefix}-summary-service-fee` : undefined} className="font-semibold text-zinc-900">
          {formatUsd(serviceFee, 2)}
        </span>
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-4 text-sm">
        <span className="text-zinc-600">Booking total</span>
        <span data-testid={testIdPrefix ? `${testIdPrefix}-summary-order-total` : undefined} className="font-semibold text-zinc-900">
          {formatUsd(bookingTotal, 2)}
        </span>
      </div>
    </>
  );
}
