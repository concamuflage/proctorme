"use client";

import React from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import CartButton from "@/components/cart/CartButton";
import { useAuthModal } from "@/components/auth/AuthModalContext";
import LoginModal from "@/components/auth/LoginModal";
import SignupModal from "@/components/auth/SignupModal";

/**
 * Site header with auth actions and cart entry point.
 * Shows login/signup buttons when logged out, and sign-out when logged in.
 */
export default function Header() {
  const { data: session } = useSession();
  const {
    authMode,
    isAuthOpen,
    openLoginModal,
    openSignupModal,
    switchToLogin,
    switchToSignup,
    closeAuthModal,
  } = useAuthModal();
  const pathname = usePathname();
  const router = useRouter();
  const openedFromAuthPage = pathname === "/login" || pathname === "/signup";
  const trialBannerText =
    "If you want to buy some clothes that are not on the site, you can send us the link so we can list them on the site. If you have any suggestions, you can also write to us. All products are original, but they are bought in China and only have tags in Chinese. Shipping takes 7-60 days depending on the shipping services you choose. If U.S. Customs applies import tariffs or duties to your shipment, those charges would be the customer's responsibility.";

  const handleLoginModalSuccess = () => {
    closeAuthModal();
    if (openedFromAuthPage) {
      router.push("/products");
      router.refresh();
    }
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/products" });
  };

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="border-b border-amber-200 bg-amber-50">
        <div className="mx-auto max-w-6xl px-4 py-3 text-xs leading-5 text-amber-950 sm:px-6">
          {trialBannerText}
        </div>
      </div>
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="text-lg font-semibold tracking-tight sm:text-xl">OutlierFit</div>
        <nav className="flex flex-wrap items-center gap-3 text-sm sm:gap-4 lg:justify-end lg:gap-6">
          <Link className="whitespace-nowrap hover:underline" href="/about">
            About
          </Link>
          <Link className="whitespace-nowrap hover:underline" href="/contact">
            Contact Us
          </Link>
          <Link
            className="whitespace-nowrap rounded-full bg-zinc-900 px-3 py-2 text-white hover:bg-zinc-800 sm:px-4"
            href="/products"
          >
            Browse Items
          </Link>
          {session?.user ? (
            <div className="flex items-center gap-3">
              <Link
                href="/profile"
                aria-label="Open profile"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 text-zinc-700 hover:border-zinc-400 hover:text-zinc-900"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 21a8 8 0 0 0-16 0" />
                  <circle cx="12" cy="8" r="4" />
                </svg>
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="whitespace-nowrap text-xs text-zinc-600 hover:text-zinc-900"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={openSignupModal}
                className="whitespace-nowrap rounded-full border border-zinc-200 px-4 py-2 text-sm text-zinc-900 hover:border-zinc-400"
              >
                Sign up
              </button>
              <button
                type="button"
                onClick={openLoginModal}
                className="whitespace-nowrap rounded-full border border-zinc-200 px-4 py-2 text-sm text-zinc-900 hover:border-zinc-400"
              >
                Sign in
              </button>
            </div>
          )}
          {session?.user ? <CartButton /> : null}
        </nav>
      </div>

      {/* Render the correct modal based on current auth mode. */}
      {authMode === "login" ? (
        <LoginModal
          isOpen={isAuthOpen}
          onClose={closeAuthModal}
          onSuccess={handleLoginModalSuccess}
          // Switching modes keeps the modal open and swaps the content.
          onSwitchToSignup={switchToSignup}
        />
      ) : (
        <SignupModal
          isOpen={isAuthOpen}
          onClose={closeAuthModal}
          // Switching modes keeps the modal open and swaps the content.
          onSwitchToLogin={switchToLogin}
        />
      )}
    </header>
  );
}
