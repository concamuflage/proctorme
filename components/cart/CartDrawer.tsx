"use client"; // This directive marks the component to be rendered on the client side. This is necessary because this component uses React hooks and stateful logic that require client-side rendering.

import Link from "next/link";
import { useCart } from "@/components/cart/CartContext"; // useCart is a custom hook that provides access to the shopping cart's state and actions.
import ItemsPanel from "@/components/cart/ItemsPanel";
import OrderSummary from "@/components/cart/OrderSummary";

/**
 * Renders the cart drawer component.
 *
 * @returns The rendered UI for this component.
 */
export default function CartDrawer() {
  
  // Destructure values and functions from useCart hook:
  // - items: array of cart items
  // - isOpen: boolean indicating if the cart drawer is open
  // - subtotal: total price of items in cart
  // - closeCart: function to close the cart drawer
  // - removeItem: function to remove an item from the cart
  const {
    items,
    isOpen,
    subtotal,
    closeCart,
    removeItem,
  } = useCart();

  return (
    <div
      className={
        "fixed inset-0 z-50 transition " +
        // isOpen controls pointer events to enable or disable interaction with the drawer and backdrop
        (isOpen ? "pointer-events-auto" : "pointer-events-none") // toggle so mouse events on this element is allowed or disabled.
      }
      // aria-hidden is true when cart is closed to improve accessibility by hiding from screen readers
      // “Pretend this element and all its children do NOT exist for people who are visually impaired and use screen readers"
      aria-hidden={!isOpen}
    >
      {/* Backdrop: a semi-transparent overlay behind the cart drawer */}
      <div
        className={
          "absolute inset-0 bg-black/40 transition-opacity " +
          // isOpen controls the opacity of the backdrop for fade-in/out effect
          (isOpen ? "opacity-100" : "opacity-0")
        }
        // Clicking the backdrop calls closeCart to close the drawer
        onClick={closeCart}
      />

      <aside
          className={
          "absolute right-0 top-0 h-full w-full max-w-lg bg-white shadow-xl transition-transform " +
          // isOpen controls the drawer sliding in and out from the right
          (isOpen ? "translate-x-0" : "translate-x-full")
        }
        role="dialog"
        aria-modal="true"
        aria-label="Booking cart"
        data-testid="cart-drawer"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-4 sm:px-6">
            <div className="text-base font-semibold">Booking cart</div>
            <button
              type="button"
              onClick={closeCart} // Close button closes the cart drawer
              className="text-sm text-zinc-500 hover:text-zinc-900"
              data-testid="cart-drawer-close"
            >
              Close
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-auto px-4 py-4 sm:px-6">
            <ItemsPanel
              items={items}
              onRemove={removeItem}
              priceFractionDigits={0}
              title="Selected proctors"
              emptyMessage="No proctors selected."
              testIdPrefix="cart-drawer"
            />
            {items.length > 0 ? (
              <section className="rounded-[2rem] border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
                <OrderSummary
                  subtotal={subtotal}
                  testIdPrefix="cart-drawer"
                  legacySubtotalTestId="cart-drawer-subtotal"
                />
              </section>
            ) : null}
          </div>

          <div className="border-t border-zinc-200 px-4 py-4 sm:px-6">
            <div className="mt-4 grid gap-2">
              {/* Link to the full cart page; clicking it also closes the drawer */}
              <Link
                href="/cart"
                className="rounded-full bg-zinc-900 px-4 py-2 text-center text-sm text-white hover:bg-zinc-800"
                onClick={closeCart}
                data-testid="cart-drawer-view-cart"
              >
                Review booking
              </Link>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
