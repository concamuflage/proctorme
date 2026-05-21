"use client";

import React from "react";
import { formatUsd } from "@/lib/formatters";

type OrderSummaryProps = {
  subtotal: number;
  totalWeightKg: number;
  testIdPrefix?: string;
  legacySubtotalTestId?: string;
  title?: string;
};

export default function OrderSummary({
  subtotal,
  totalWeightKg,
  testIdPrefix,
  legacySubtotalTestId,
  title = "Booking summary",
}: OrderSummaryProps) {
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
      <div className="mt-2 flex items-center justify-between text-sm">
        <span className="text-zinc-600">Coordination units</span>
        <span data-testid={testIdPrefix ? `${testIdPrefix}-summary-shipping-weight` : undefined} className="font-semibold text-zinc-900">
          {totalWeightKg.toFixed(2)}
        </span>
      </div>
      <div className="mt-5 flex items-center justify-between text-sm">
        <span className="text-zinc-600">Site coordination</span>
        <span data-testid={testIdPrefix ? `${testIdPrefix}-summary-shipping` : undefined} className="font-semibold text-zinc-900">
          Included
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between text-sm">
        <span className="text-zinc-600">Booking total</span>
        <span data-testid={testIdPrefix ? `${testIdPrefix}-summary-order-total` : undefined} className="font-semibold text-zinc-900">
          {formatUsd(subtotal, 2)}
        </span>
      </div>
    </>
  );
}
