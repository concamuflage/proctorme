// This file configures NextAuth, a library for handling authentication in Next.js applications.
// NextAuth simplifies adding sign-in, sign-out, and session management features.
// This configuration sets up credential-based login by verifying user credentials against a backend API.

import type { NextAuthOptions } from "next-auth"; // Type definitions for NextAuth configuration options.
import CredentialsProvider from "next-auth/providers/credentials"; // Provider for username/password authentication.
import { getServerApiBaseUrl } from "@/lib/api-base";

const EMAIL_NOT_VERIFIED_MESSAGE = "Please verify your email before signing in.";

type BackendLoginUser = {
  id: number | string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  emailVerified?: boolean;
};

// The `authOptions` object defines how NextAuth should handle authentication in this app.
// It is exported so it can be used by the NextAuth API route handlers in the app.

// “I am creating an object called authOptions.
// I promise that this object has exactly the shape that NextAuth expects and has the same shape as NextAuthOptions”
// NextAuthOptions specified the keys, and the type of values for each key.
// That returned object is what NextAuth actually uses internally
export const authOptions: NextAuthOptions = {
  providers: [

    // not a class , not a component, it's like a function
    // it takes the object and returns an object that will be used 
    // this will return a provider, and a provider is an object.
    CredentialsProvider({
      // A credentials provider allows users to sign in using arbitrary credentials such as email and password.
      // It requires defining what credentials to accept and how to verify them.
      name: "Credentials",
      // The `credentials` object defines the fields the sign-in form will show and collect from the user.
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      // IMPORTANT RUNTIME NOTE:
      // This `authorize()` function runs on the Next.js server where NextAuth lives,
      // NOT in the browser and NOT in your backend `server.js`.
      //
      // Execution flow:
      // Browser -> NextAuth API route (/api/auth/*) -> authorize()
      //                          |
      //                          +-> fetch() -> backend server (server.js)
      //
      // So this function acts as a secure bridge between the browser and your backend API.
      // The `authorize` function is called when a user submits the sign-in form.
      // It receives the credentials entered by the user and must verify them.
      // If verification succeeds, it returns a user object; otherwise, it returns null to indicate failure.
      async authorize(credentials) {
        // Validate input early: check if email and password are provided.
        if (!credentials?.email || !credentials?.password) return null;

        // Look up the backend API base URL from environment variables.
        // This URL is where we will send the credentials for verification.
        const apiBase = getServerApiBaseUrl();
        if (!apiBase) return null;

        // Send a POST request to the backend login endpoint with the provided email and password.
        // The backend is responsible for checking if these credentials are valid.
        const res = await fetch(`${apiBase}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password,
          }),
        });

        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          const message =
            typeof payload?.error === "string" && payload.error.trim()
              ? payload.error.trim()
              : "Invalid email or password.";
          throw new Error(message);
        }

        // Parse the response JSON to get the user data returned by the backend.
        const user = (await res.json()) as BackendLoginUser;
        // Ensure the user object contains required fields; otherwise, treat it as invalid.
        if (!user?.id || !user?.email) return null;

        if (user.emailVerified === false) {
          throw new Error(EMAIL_NOT_VERIFIED_MESSAGE);
        }

        // Build a display name by combining first and last names if available,
        // or fallback to using the email as the display name.
        const displayName =
          [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
          user.email;

        // Return a user object with id, name, and email that NextAuth will store in the session.
        return {
          id: String(user.id),
          name: displayName,
          email: user.email,
          verifiedEmail: true,
        };
      },
    }),
  ],
  // Use JSON Web Tokens (JWT) for session management instead of database sessions.
  // This means user sessions are encoded in tokens passed between client and server.
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.userId = user.id;
        token.verifiedEmail = user.verifiedEmail === true;
      }

      return token;
    },
    async session({ session, token }) {
      if (token.verifiedEmail === false) {
        return {
          ...session,
          user: undefined,
        };
      }

      if (session.user && typeof token.userId === "string") {
        session.user.id = token.userId;
      }
      return session;
    },
  },
  // Specify a custom sign-in page URL to route users to when they need to log in.
  pages: { signIn: "/login" },
};
