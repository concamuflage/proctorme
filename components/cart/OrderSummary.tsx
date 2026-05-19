"use client";

import React, { useMemo, useState } from "react";
import ShippingOptionsPanel from "@/components/cart/ShippingOptionsPanel";
import { formatUsd } from "@/lib/formatters";
import { getBoxWeightKg, type ShippingOption } from "@/lib/shipping";

type OrderSummaryProps = {
  subtotal: number;
  totalWeightKg: number;
  shippingOptions: ShippingOption[];
  selectedShippingModeId: number | null;
  selectedShippingOption: ShippingOption | null;
  onSelectShippingMode: (id: number) => void;
  shippingError: string | null;
  shippingLoading?: boolean;
  radioName: string;
  testIdPrefix?: string;
  legacySubtotalTestId?: string;
  title?: string;
};

export default function OrderSummary({
  subtotal,
  totalWeightKg,
  shippingOptions,
  selectedShippingModeId,
  selectedShippingOption,
  onSelectShippingMode,
  shippingError,
  shippingLoading = false,
  radioName,
  testIdPrefix,
  legacySubtotalTestId,
  title = "Order summary",
}: OrderSummaryProps) {
  const [showWeightBreakdown, setShowWeightBreakdown] = useState(false);
  const boxWeightKg = useMemo(() => getBoxWeightKg(totalWeightKg), [totalWeightKg]);
  const shipmentWeightKg = useMemo(() => totalWeightKg + boxWeightKg, [boxWeightKg, totalWeightKg]);
  const orderTotal = subtotal + (selectedShippingOption?.shippingCostUsd ?? 0);

  return (
    <>
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-zinc-600">Subtotal</span>
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
        <span className="text-zinc-600">Shipping weight</span>
        <span data-testid={testIdPrefix ? `${testIdPrefix}-summary-shipping-weight` : undefined} className="font-semibold text-zinc-900">
          {shipmentWeightKg.toFixed(2)} kg
        </span>
      </div>
      <button
        type="button"
        onClick={() => setShowWeightBreakdown((prev) => !prev)}
        data-testid={testIdPrefix ? `${testIdPrefix}-summary-weight-toggle` : undefined}
        className="mt-1 text-xs text-zinc-500 hover:text-zinc-900"
      >
        {showWeightBreakdown ? "Hide weight details" : "Show weight details"}
      </button>
      {showWeightBreakdown ? (
        <>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-zinc-600">Clothes weight</span>
            <span data-testid={testIdPrefix ? `${testIdPrefix}-summary-clothes-weight` : undefined} className="font-semibold text-zinc-900">
              {totalWeightKg.toFixed(2)} kg
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-zinc-600">Box weight</span>
            <span data-testid={testIdPrefix ? `${testIdPrefix}-summary-box-weight` : undefined} className="font-semibold text-zinc-900">
              {boxWeightKg.toFixed(2)} kg
            </span>
          </div>
        </>
      ) : null}

      <div className="mt-5">
        <ShippingOptionsPanel
          shippingOptions={shippingOptions}
          selectedShippingModeId={selectedShippingModeId}
          onSelectShippingMode={onSelectShippingMode}
          shippingError={shippingError}
          shippingLoading={shippingLoading}
          radioName={radioName}
          testIdPrefix={testIdPrefix}
        />
      </div>

      <div className="mt-5 flex items-center justify-between text-sm">
        <span className="text-zinc-600">Shipping</span>
        <span data-testid={testIdPrefix ? `${testIdPrefix}-summary-shipping` : undefined} className="font-semibold text-zinc-900">
          {formatUsd(selectedShippingOption?.shippingCostUsd ?? 0, 2)}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between text-sm">
        <span className="text-zinc-600">Order total</span>
        <span data-testid={testIdPrefix ? `${testIdPrefix}-summary-order-total` : undefined} className="font-semibold text-zinc-900">
          {formatUsd(orderTotal, 2)}
        </span>
      </div>
    </>
  );
}
