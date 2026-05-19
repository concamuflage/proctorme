"use client";

import React from "react";
import CartItemRow from "@/components/cart/CartItemRow";
import { type CartItem } from "@/components/cart/CartContext";

type ItemsPanelProps = {
  items: CartItem[];
  onRemove: (id: string) => void;
  onUpdateQty: (id: string, qty: number) => void;
  title?: string;
  emptyMessage?: string;
  priceFractionDigits?: number;
  className?: string;
  testIdPrefix?: string;
};

export default function ItemsPanel({
  items,
  onRemove,
  onUpdateQty,
  title = "Items",
  emptyMessage = "Your cart is empty.",
  priceFractionDigits = 2,
  className = "rounded-[2rem] border border-zinc-200 bg-zinc-50 p-4 shadow-sm sm:p-6",
  testIdPrefix = "cart",
}: ItemsPanelProps) {
  return (
    <section className={className}>
      <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
      <div className="mt-4 space-y-4">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-600">
            {emptyMessage}
          </div>
        ) : (
          items.map((item) => (
            <CartItemRow
              key={item.id}
              item={item}
              onRemove={onRemove}
              onUpdateQty={onUpdateQty}
              priceFractionDigits={priceFractionDigits}
              testIdPrefix={testIdPrefix}
            />
          ))
        )}
      </div>
    </section>
  );
}
