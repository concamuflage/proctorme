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

type RoleSwitcherProps = {
  roles: AccountRole[];
  activeRole: string;
  onRoleChange: (roleName: string) => void;
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
  return roleName === "corporate_user" || roleName === "cooporate_user";
}

/**
 * Renders the role switcher shown when a signed-in account has multiple roles.
 *
 * @param props - Roles to render, the selected role name, and the callback that
 * handles user role changes.
 *
 * @returns The role switcher button group.
 */
function RoleSwitcher({ roles, activeRole, onRoleChange }: RoleSwitcherProps) {
  return (
    <div className="flex rounded-full border border-zinc-200 bg-white p-1" aria-label="Current role">
      {roles.map((role) => {
        const selected = role.name === activeRole;
        return (
          <button
            key={role.id}
            type="button"
            onClick={() => onRoleChange(role.name)}
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
  );
}

/**
 * Renders the profile icon used by the header profile link.
 *
 * @returns The profile icon SVG.
 */
function UserIcon() {
  return (
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
  );
}

/**
 * Site header with auth actions and cart entry point.
 * Shows login/signup buttons when logged out, and sign-out when logged in.
 * The header uses the browser-visible NextAuth session only to decide which UI
 * controls to show; protected data is still loaded through server-verified API
 * routes.
 */
export default function Header() {
  // useSession reads the SessionProvider state in the browser. When needed,
  // SessionProvider gets the public session JSON from /api/auth/session.
  const { data: session } = useSession();

  // Roles shown in the header role switcher. They are cleared when the browser
  // session has no user and populated after /api/account/roles verifies the
  // HttpOnly auth cookie on the server.
  // AccountRole[] an array of of AccountRole objects
  const [roles, setRoles] = useState<AccountRole[]>([]);

  // Currently selected role for UI routing/filtering. The setter is called
  // after roles load and when the user switches roles, then the value is
  // persisted in localStorage for the next browser visit.
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
  // useEffect with a dependency on session?.user runs after the component mounts and whenever the session user changes.
  // there is a diagram for the flow in the diagrams folder
  useEffect(() => {
    // A missing session user means the user is logged out or the session has not
    // resolved to an authenticated user, so role-specific header state must not
    // remain visible from a previous login.
    if (!session?.user) {
      setRoles([]);
      setActiveRole("");
      return;
    }
    //cancelled prevents the old async request from updating React state after it is no longer valid.

    let cancelled = false;

    /**
     * Loads the signed-in user's account roles for the header role switcher.
     *
     * @returns A promise that resolves after role state and localStorage are synchronized.
     */
    async function loadRoles() {
      // This client fetch does not trust the browser session object for
      // authorization. The API route uses getServerSession(authOptions) on the
      // server, reads the HttpOnly cookie, and returns only roles for that user.
      const response = await fetch("/api/account/roles", { cache: "no-store" });
      const payload = await response.json().catch(() => null);

      //If this request is stale, or the API failed, or the response does not contain a roles array, do nothing.
      
      // cancelled = true;The effect is no longer current. Maybe the component unmounted, the user logged out, 
      // or the session changed while the fetch was still running. So ignore this old response.
      // why return?Because after this line, the code assumes roles are valid:
      // return still returns Promise.resolve(undefined) to satisfy the async function signature, 
      // but the main point is to exit the function early and not update React state with invalid data.
      if (cancelled || !response.ok || !Array.isArray(payload?.roles)) return;

      // Normalize and sort roles before rendering so the role switcher has a
      // stable order across refreshes and API responses.
      const loadedRoles = payload.roles
        .filter((role: Partial<AccountRole>) => Number.isInteger(Number(role.id)) && typeof role.name === "string")
        .map((role: AccountRole) => ({ id: Number(role.id), name: role.name }))
        .sort((a: AccountRole, b: AccountRole) => rolePriority(a.name) - rolePriority(b.name) || roleLabel(a.name).localeCompare(roleLabel(b.name)));

      // Keep the previous role only if the current account still has it;
      // otherwise fall back to the highest-priority role from the API response.
      const savedRole = window.localStorage.getItem(ACTIVE_ROLE_STORAGE_KEY) || "";
      const nextActiveRole = loadedRoles.some((role: AccountRole) => role.name === savedRole)
        ? savedRole
        : loadedRoles[0]?.name ?? "";

      setRoles(loadedRoles);
      setActiveRole(nextActiveRole);
      if (nextActiveRole) window.localStorage.setItem(ACTIVE_ROLE_STORAGE_KEY, nextActiveRole);
    }

    // only runs if loadRoles() throws an error or returns a rejected Promise.
    // for example, const response = await fetch("/api/account/roles", { cache: "no-store" }); 
    // can produce an error.
    loadRoles().catch(() => {
      // Role loading is optional for rendering the header. On failure, clear role
      // UI so stale or partial account-role state is not shown.
      if (!cancelled) {
        setRoles([]);
        setActiveRole("");
      }
    });

    // return a function, it doesn't run immediately. React stores it as the cleanup function.
    // React calls the cleanup function when:
    // The component unmounts, or
    // The dependency changes and React is about to re-run the effect

    return () => {
      cancelled = true;
    };
  }, [session?.user]);

  const activeRoleLabel = useMemo(
    () => activeRole ? roleLabel(activeRole) : "", 
    [activeRole]
  );
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
    // The profile route reads role-dependent data on page load, so reload it to
    // avoid showing information for the previously selected role.
    if (pathname === "/profile") {
      window.location.reload();
      return;
    }
    // Other routes can revalidate server components without a full page reload.
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
          {  /*  the following to conditional rendering the rest of the nav bar. if session user exists, show roleswitcher -if more than 2 roles,the profile icon and sign out buttons;
          otherwise, show the login and signup buttons. */}
          {session?.user ? 
          (
            <div className="flex items-center gap-3">
              {/* the following is a nested ternary expression */}
              {roles.length > 1 ? (
                <RoleSwitcher
                  roles={roles}
                  activeRole={activeRole}
                  onRoleChange={handleRoleChange}
                />
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
                <UserIcon />
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="whitespace-nowrap text-xs text-zinc-600 hover:text-zinc-900"
              >
                Sign out
              </button>
            </div>
          ) 
          : 
          (
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
