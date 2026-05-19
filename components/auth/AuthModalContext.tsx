"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

type AuthMode = "login" | "signup";

type AuthModalContextValue = {
  authMode: AuthMode;
  isAuthOpen: boolean;
  openLoginModal: () => void;
  openSignupModal: () => void;
  switchToLogin: () => void;
  switchToSignup: () => void;
  closeAuthModal: () => void;
};

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");

  const value = useMemo<AuthModalContextValue>(() => ({
    authMode,
    isAuthOpen,
    openLoginModal: () => {
      setAuthMode("login");
      setIsAuthOpen(true);
    },
    openSignupModal: () => {
      setAuthMode("signup");
      setIsAuthOpen(true);
    },
    switchToLogin: () => setAuthMode("login"),
    switchToSignup: () => setAuthMode("signup"),
    closeAuthModal: () => setIsAuthOpen(false),
  }), [authMode, isAuthOpen]);

  return <AuthModalContext.Provider value={value}>{children}</AuthModalContext.Provider>;
}

export function useAuthModal() {
  const context = useContext(AuthModalContext);
  if (!context) {
    throw new Error("useAuthModal must be used within AuthModalProvider");
  }
  return context;
}
