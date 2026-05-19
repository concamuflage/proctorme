"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { useCart } from "@/components/cart/CartContext";


// this is the component shown in the upper right corner.

export default function CartButton() {
  // useCart() returns a CartContextValue, and we want the following two fields from the object.
  const { itemCount, openCart } = useCart();
  const { data: session } = useSession();

  return (
    <button
      type="button"
      // openCart will change isOpen
      onClick={openCart}
      className="flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-2 text-sm text-zinc-900 hover:border-zinc-400"
      aria-label="Open cart"
      data-testid="cart-button"
    >
      <span>Cart</span>
      {session?.user ? (
        <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-xs text-white">
          {itemCount} item{itemCount === 1 ? "" : "s"}
        </span>
      ) : null}
    </button>
  );
}
