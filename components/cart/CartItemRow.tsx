"use client";

import React from "react";
import { type CartItem } from "@/components/cart/CartContext";
import { formatUsd } from "@/lib/formatters";

// This component represents a single row in the shopping cart.
// It displays the product image, information, quantity controls, and a remove button.
type CartItemRowProps = {
  // The cart item data to display
  item: CartItem;
  // Callback function to remove the item from the cart
  onRemove: (id: string) => void;
  priceFractionDigits?: number;
  testIdPrefix?: string;
};

function formatSession(item: CartItem) {
  if (!item.startIso || !item.endIso) return item.size ?? null;

  const start = new Date(item.startIso);
  const end = new Date(item.endIso);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return item.size ?? null;

  const dateLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(start);
  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return `${dateLabel}, ${timeFormatter.format(start)} - ${timeFormatter.format(end)}`;
}

function imageSrc(url: string) {
  return url.startsWith("gcs://")
    ? `/api/proctor-files/profile-image?url=${encodeURIComponent(url)}`
    : url;
}

export default function CartItemRow({
  item,
  onRemove,
  priceFractionDigits = 2,
  testIdPrefix = "cart",
}: CartItemRowProps) {
  const sessionHours =
    typeof item.sessionHours === "number" && Number.isFinite(item.sessionHours) && item.sessionHours > 0
      ? item.sessionHours
      : 1;
  const hourlyRate = item.price / sessionHours;
  const sessionLabel = formatSession(item);

  return (
    <div
      className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-4 sm:flex-row"
      data-testid={`${testIdPrefix}-line-item-${item.id}`}
    >
      {/* Product image section */}
      <div className="h-20 w-20 flex-none overflow-hidden rounded-xl bg-zinc-100">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageSrc(item.imageUrl)} alt={item.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500">
            Proctor
          </div>
        )}
      </div>

      {/* Product info and controls */}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {/* Product name, color, size, and price */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="text-sm font-medium text-zinc-900 sm:truncate">{item.name}</div>
            <div className="mt-1 space-y-0.5 text-xs leading-5 text-zinc-500">
              {item.color ? <div>Location: {item.color}</div> : null}
              {sessionLabel ? <div>Session: {sessionLabel}</div> : null}
              <div>Hourly rate: {formatUsd(hourlyRate, priceFractionDigits)}</div>
              <div>Hours: {sessionHours}</div>
            </div>
          </div>
          <div className="text-sm font-semibold text-zinc-900 sm:text-right">
            {formatUsd(item.price, priceFractionDigits)}
          </div>
        </div>

        <div className="flex justify-start sm:justify-end">
          <button
            type="button"
            // Calls onRemove to remove this item from the cart
            onClick={() => onRemove(item.id)}
            className="self-start text-xs text-zinc-500 hover:text-zinc-900 sm:self-auto"
            data-testid={`${testIdPrefix}-item-remove-${item.id}`}
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
