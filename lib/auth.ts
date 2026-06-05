import type { NextAuthOptions } from "next-auth"; // Type definitions for NextAuth configuration options.
import CredentialsProvider from "next-auth/providers/credentials"; // Provider for username/password authentication.
import { loginUser } from "@/lib/server/localAuthStore";

const EMAIL_NOT_VERIFIED_MESSAGE = "Please verify your email before signing in.";

type BackendLoginUser = {
  id: number | string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  emailVerified?: boolean;
};

// The `authOptions` object defines how NextAuth should handle authentication in this app.

// “I am creating an object called authOptions.
// I promise that this object has exactly the shape that NextAuth expects and has the same shape as NextAuthOptions”
// NextAuthOptions specified the keys, and the type of values for each key.
// That returned object is what NextAuth actually uses internally
export const authOptions: NextAuthOptions = {
  providers: [

    // CredentialsProvider is a function.
    // it takes the object and returns an provider object that NextAuth can use to handle authentication.
    CredentialsProvider({
      // A credentials provider allows users to sign in using arbitrary credentials such as email and password.
      // It requires defining what credentials to accept and how to verify them.
      name: "Credentials",
      // The `credentials` object defines the fields the sign-in form will show and collect from the user.
      credentials: {
        email: { label: "Email", type: "email" }, // label:name of the field, type : <input type="email" />
        password: { label: "Password", type: "password" },
      },
      // The `authorize` function is called when a user submits the sign-in form.
      // It receives the credentials entered by the user and must verify them.
      // If verification succeeds, it returns a user object; otherwise, it returns null to indicate failure.
      async authorize(credentials) {
        // Validate input early: check if email and password are provided.
        if (!credentials?.email || !credentials?.password) return null;

        const result = await loginUser({
          email: credentials.email,
          password: credentials.password,
        });

        if (result.status < 200 || result.status >= 300) {
          const message =
            typeof result.body?.error === "string" && result.body.error.trim() //if the error is a string and not empty, use it as the message
              ? result.body.error.trim()
              : "Invalid email or password.";
          throw new Error(message);
        }

        const user = result.body as BackendLoginUser;
        // Ensure the user object contains required fields; otherwise, treat it as invalid.
        if (!user?.id || !user?.email) return null;

        if (user.emailVerified === false) {
          throw new Error(EMAIL_NOT_VERIFIED_MESSAGE);
        }

        // putting the first and last name in an array, filtering out any empty values, joining them with a space, and trimming whitespace.
        // or if both are missing, use the email as the display name.
        // .filter(item => Boolean(item)), filter needs a function, so we cannot use true or false, we need to use Boolean(item) to filter out falsy values.
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
  // callbacks let us customize what NextAuth stores in the JWT and what it exposes in the session.
  callbacks: {
    // The jwt callback function runs when NextAuth creates or updates the JWT token.
    // On the first successful login, `user` exists, so we copy custom values onto the token.
    async jwt({ token, user }) {
      // Usually, user only exists on the first successful login.
      if (user?.id) {
        // Save the user's id in the token so it can be used later in the session callback.
        token.userId = user.id;
        // Save whether the user has a verified email.
        token.verifiedEmail = user.verifiedEmail === true;
      }

      return token;
    },
    // The session callback controls what data is available to the frontend through useSession/getSession.
    // It receives the token created by the jwt callback.
    async session({ session, token }) {
      // If the token says the email is not verified, remove the user from the session.
      if (token.verifiedEmail === false) {
        return {
          ...session,
          user: undefined,
        };
      }

      // Add the custom user id from the token onto session.user so frontend code can use it.
      if (session.user && typeof token.userId === "string") {
        session.user.id = token.userId;
      }
      return session;
    },
  },
  // Specify a custom sign-in page URL to route users to when they need to log in.
  pages: { signIn: "/login" },
};
