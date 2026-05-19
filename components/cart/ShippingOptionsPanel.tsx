"use client";

import React, { useState } from "react";
import { formatUsd } from "@/lib/formatters";
import { formatShippingMode, type ShippingOption } from "@/lib/shipping";

const RMB_TO_USD = Number(process.env.NEXT_PUBLIC_RMB_TO_USD ?? "0.14");

type ShippingOptionsPanelProps = {
  title?: string;
  shippingOptions: ShippingOption[];
  selectedShippingModeId: number | null;
  onSelectShippingMode: (id: number) => void;
  shippingError: string | null;
  shippingLoading?: boolean;
  radioName: string;
  testIdPrefix?: string;
};

export default function ShippingOptionsPanel({
  title = "Shipping options",
  shippingOptions,
  selectedShippingModeId,
  onSelectShippingMode,
  shippingError,
  shippingLoading = false,
  radioName,
  testIdPrefix,
}: ShippingOptionsPanelProps) {
  const [expandedOptionIds, setExpandedOptionIds] = useState<number[]>([]);

  function toggleOptionDetails(optionId: number) {
    setExpandedOptionIds((current) =>
      current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId]
    );
  }

  return (
    <div>
      <div className="text-sm font-medium text-zinc-900">{title}</div>
      <div className="mt-3 space-y-2">
        {shippingOptions.map((option) => (
          <div
            key={option.id}
            data-testid={testIdPrefix ? `${testIdPrefix}-shipping-option-${option.id}` : undefined}
            className="flex cursor-pointer items-start justify-between gap-3 rounded-2xl border border-zinc-200 p-3"
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name={radioName}
                data-testid={testIdPrefix ? `${testIdPrefix}-shipping-option-input-${option.id}` : undefined}
                checked={option.id === selectedShippingModeId}
                onChange={() => onSelectShippingMode(option.id)}
                className="mt-1"
              />
              <div>
                <div className="flex items-center gap-2">
                  <div
                    data-testid={testIdPrefix ? `${testIdPrefix}-shipping-option-mode-${option.id}` : undefined}
                    className="text-sm font-medium text-zinc-900"
                  >
                    {formatShippingMode(option.mode)}
                  </div>
                  {option.delivery_time ? (
                    <div className="text-xs text-zinc-500">{option.delivery_time}</div>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    toggleOptionDetails(option.id);
                  }}
                  className="mt-1 text-xs text-zinc-500 hover:text-zinc-900"
                >
                  {expandedOptionIds.includes(option.id) ? "Hide rate details" : "Show rate details"}
                </button>
                {expandedOptionIds.includes(option.id) ? (
                  <div className="mt-1 text-xs text-zinc-500">
                    First kg{" "}
                    {testIdPrefix ? (
                      <span data-testid={`${testIdPrefix}-shipping-option-first-rate-${option.id}`}>
                        {formatUsd((option.first_kg_cost_rmb ?? 0) * RMB_TO_USD, 2)}
                      </span>
                    ) : (
                      formatUsd((option.first_kg_cost_rmb ?? 0) * RMB_TO_USD, 2)
                    )}
                    {" · "}
                    Additional kg{" "}
                    {testIdPrefix ? (
                      <span data-testid={`${testIdPrefix}-shipping-option-additional-rate-${option.id}`}>
                        {formatUsd((option.additional_kg_cost_rmb ?? 0) * RMB_TO_USD, 2)}
                      </span>
                    ) : (
                      formatUsd((option.additional_kg_cost_rmb ?? 0) * RMB_TO_USD, 2)
                    )}
                  </div>
                ) : testIdPrefix ? (
                  <>
                    <span className="hidden" data-testid={`${testIdPrefix}-shipping-option-first-rate-${option.id}`}>
                      {formatUsd((option.first_kg_cost_rmb ?? 0) * RMB_TO_USD, 2)}
                    </span>
                    <span className="hidden" data-testid={`${testIdPrefix}-shipping-option-additional-rate-${option.id}`}>
                      {formatUsd((option.additional_kg_cost_rmb ?? 0) * RMB_TO_USD, 2)}
                    </span>
                  </>
                ) : null}
              </div>
            </div>
            <div
              data-testid={testIdPrefix ? `${testIdPrefix}-shipping-option-total-${option.id}` : undefined}
              className="text-sm font-semibold text-zinc-900"
            >
              {formatUsd(option.shippingCostUsd, 2)}
            </div>
          </div>
        ))}

        {shippingLoading ? (
          <div className="text-xs text-zinc-500">Loading shipping options...</div>
        ) : null}

        {!shippingLoading && shippingOptions.length === 0 && !shippingError ? (
          <div className="text-xs text-zinc-500">No shipping options available.</div>
        ) : null}

        {shippingError ? <div className="text-xs text-red-600">{shippingError}</div> : null}
      </div>
    </div>
  );
}
