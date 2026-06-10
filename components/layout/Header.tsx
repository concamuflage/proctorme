"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import CartButton from "@/components/cart/CartButton";
import { useAuthModal } from "@/components/auth/AuthModalContext";
import LoginModal from "@/components/auth/LoginModal";
import SignupModal from "@/components/auth/SignupModal";
import { SITE_NAME } from "@/lib/proctor";

type AccountRole = {
  id: number;
  name: string;
};

const ACTIVE_ROLE_STORAGE_KEY = "proctorme.activeRole";

/**
 * Runs the role label logic for this module.
 *
 * @param roleName - Input used by role label.
 *
 * @returns The result used by the surrounding flow.
 */
function roleLabel(roleName: string) {
  if (roleName === "admin") return "Admin";
  if (roleName === "proctor") return "Proctor";
  if (roleName === "corporate_user" || roleName === "cooporate_user" || roleName === "interviewee") {
    return "Organization user";
  }
  return roleName
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/**
 * Runs the role priority logic for this module.
 *
 * @param roleName - Input used by role priority.
 *
 * @returns The result used by the surrounding flow.
 */
function rolePriority(roleName: string) {
  if (roleName === "admin") return 0;
  if (roleName === "corporate_user" || roleName === "cooporate_user" || roleName === "interviewee") return 1;
  if (roleName === "proctor") return 2;
  return 3;
}

/**
 * Checks whether organization role is true for this flow.
 *
 * @param roleName - Input used by is organization role.
 *
 * @returns True when the value satisfies the check.
 */
function isOrganizationRole(roleName: string) {
  return roleName === "corporate_user" || roleName === "cooporate_user" || roleName === "interviewee";
}

/**
 * Site header with auth actions and cart entry point.
 * Shows login/signup buttons when logged out, and sign-out when logged in.
 */
export default function Header() {
  const { data: session } = useSession();
  const [roles, setRoles] = useState<AccountRole[]>([]);
  const [activeRole, setActiveRole] = useState("");
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
    "Book verified proctors for interviews, assessments, and hiring events at the location you specify. Choose a proctor, select the session window, confirm the site address, and pay securely before the assignment is scheduled.";

  useEffect(() => {
    if (!session?.user) {
      setRoles([]);
      setActiveRole("");
      return;
    }

    let cancelled = false;

    /**
     * Loads roles needed by this flow.
     *
     * @returns The result used by the surrounding flow.
     */
    async function loadRoles() {
      const response = await fetch("/api/account/roles", { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (cancelled || !response.ok || !Array.isArray(payload?.roles)) return;

      const loadedRoles = payload.roles
        .filter((role: Partial<AccountRole>) => Number.isInteger(Number(role.id)) && typeof role.name === "string")
        .map((role: AccountRole) => ({ id: Number(role.id), name: role.name }))
        .sort((a: AccountRole, b: AccountRole) => rolePriority(a.name) - rolePriority(b.name) || roleLabel(a.name).localeCompare(roleLabel(b.name)));

      const savedRole = window.localStorage.getItem(ACTIVE_ROLE_STORAGE_KEY) || "";
      const nextActiveRole = loadedRoles.some((role: AccountRole) => role.name === savedRole)
        ? savedRole
        : loadedRoles[0]?.name ?? "";

      setRoles(loadedRoles);
      setActiveRole(nextActiveRole);
      if (nextActiveRole) window.localStorage.setItem(ACTIVE_ROLE_STORAGE_KEY, nextActiveRole);
    }

    loadRoles().catch(() => {
      if (!cancelled) {
        setRoles([]);
        setActiveRole("");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [session?.user]);

  const activeRoleLabel = useMemo(() => activeRole ? roleLabel(activeRole) : "", [activeRole]);
  const showFindProctors = session?.user ? isOrganizationRole(activeRole) : true;

  /**
   * Handles role change for this component.
   *
   * @param roleName - Input used by handle role change.
   *
   * @returns The result used by the surrounding flow.
   */
  const handleRoleChange = (roleName: string) => {
    if (!roleName || roleName === activeRole) return;
    setActiveRole(roleName);
    window.localStorage.setItem(ACTIVE_ROLE_STORAGE_KEY, roleName);
    if (pathname === "/profile") {
      window.location.reload();
      return;
    }
    router.refresh();
  };

  /**
   * Handles login modal success for this component.
   *
   * @returns The result used by the surrounding flow.
   */
  const handleLoginModalSuccess = () => {
    closeAuthModal();
    const callbackUrl = openedFromAuthPage ? "/proctors" : pathname || "/proctors";
    router.push(`/account/post-login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    router.refresh();
  };

  /**
   * Handles sign out for this component.
   *
   * @returns The result used by the surrounding flow.
   */
  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/proctors" });
  };

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="border-b border-amber-200 bg-amber-50">
        <div className="mx-auto max-w-6xl px-4 py-3 text-xs leading-5 text-amber-950 sm:px-6">
          {trialBannerText}
        </div>
      </div>
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <Link href="/" className="text-lg font-semibold tracking-tight sm:text-xl">
          {SITE_NAME}
        </Link>
        <nav className="flex flex-wrap items-center gap-3 text-sm sm:gap-4 lg:justify-end lg:gap-6">
          <Link className="whitespace-nowrap hover:underline" href="/about">
            About
          </Link>
          <Link className="whitespace-nowrap hover:underline" href="/contact">
            Contact Us
          </Link>
          {showFindProctors ? (
            <Link
              className="whitespace-nowrap rounded-full bg-zinc-900 px-3 py-2 text-white hover:bg-zinc-800 sm:px-4"
              href="/proctors"
            >
              Find Proctors
            </Link>
          ) : null}
          {session?.user ? (
            <div className="flex items-center gap-3">
              {roles.length > 1 ? (
                <div className="flex rounded-full border border-zinc-200 bg-white p-1" aria-label="Current role">
                  {roles.map((role) => {
                    const selected = role.name === activeRole;
                    return (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => handleRoleChange(role.name)}
                        aria-pressed={selected}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                          selected
                            ? "bg-zinc-900 text-white"
                            : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                        }`}
                      >
                        {roleLabel(role.name)}
                      </button>
                    );
                  })}
                </div>
              ) : activeRoleLabel ? (
                <div className="rounded-full border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700">
                  {activeRoleLabel}
                </div>
              ) : null}
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
