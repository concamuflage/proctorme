// Marks this file as a Client Component in Next.js App Router
"use client";

// Import React for creating React components
import React from "react";
// Import SessionProvider to manage auth state across the app
import { SessionProvider } from "next-auth/react";
// Import CartProvider to manage cart state across the app
import { CartProvider } from "@/components/cart/CartContext";
import { AuthModalProvider } from "@/components/auth/AuthModalContext";

// Providers component serves as a wrapper for all global providers in the app
// this component is used in layout. Everything under layout.tsx gets access to the cart context.

export default function Providers({ children }: { children: React.ReactNode }) {
  // children: React.ReactNode means this component accepts any valid React child elements
  return (
    // SessionProvider + CartProvider wrap the app to provide context to all children components
    <SessionProvider>
      <AuthModalProvider>
        <CartProvider>{children}</CartProvider>
      </AuthModalProvider>
    </SessionProvider>
  );
}
