import type { NextAuthOptions } from "next-auth"; // Type definitions for NextAuth configuration options.
import CredentialsProvider from "next-auth/providers/credentials"; // Provider for username/password authentication.
import { loginUser as checkCredentialsAgainstDatabase } from "@/lib/server/localAuthStore";

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
    
    CredentialsProvider(
      {
      // is the display name for this auth provider.
     // It is mainly used by NextAuth when it needs to show or describe the provider, especially on the default NextAuth sign-in page.

      //For example, on the built-in page it may show something like:
      // Sign in with Credentials


      name: "Credentials",
      // The `credentials` object defines the fields the sign-in form will show and collect from the user 
      // if we use the the login form provided by NextAuth.
      // in this app, the login form is custom, so these fields are not used by the front end component LoginForm.
      // however, we cannot delete this object because 
      // Even if the custom frontend does not use it to render fields,
      // NextAuth still expects that provider to declare what credential fields it accepts.
      credentials: {
        email: { label: "Email", type: "email" }, // label:name of the field, type : <input type="email" />
        password: { label: "Password", type: "password" },
      },

      // The `authorize` function is called when a user submits the sign-in form.
      // It receives the credentials entered by the user and must verify them.
      // If verification succeeds, it returns a user object; otherwise, it returns null to indicate failure.
      /**
       * Runs the authorize logic for this module.
       *
       * @param credentials - Input used by authorize.
       *
       * @returns The result used by the surrounding flow.
       */
      async authorize(credentials) {
        // Validate input early: check if email and password are provided.
        if (!credentials?.email || !credentials?.password) return null;

        const result = await checkCredentialsAgainstDatabase({
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
        //  type assertion
        // "Trust me, result.body has the BackendLoginUser shape".
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

        // this returned object will be passed into the JWT callback as user argument.
        return {
          id: String(user.id),
          name: displayName,
          email: user.email,
          verifiedEmail: true,
        };
      },
    }
  ),
  ],

  // Use JSON Web Tokens (JWT) for session management instead of database sessions.
  // This means user sessions are encoded in tokens passed between client and server.
  session: { strategy: "jwt" },

  // callbacks let us customize what NextAuth stores in the JWT 
  // and what it exposes in the the result of useSession/getSession on the frontend.
  
  callbacks: {
    // The jwt callback function runs when NextAuth creates or updates the JWT token.
    // On the first successful login, `user` exists, so we copy custom values onto the token.
    // NextAuth calls jwt with a object like 
    // {
    //   token, // misnomer, it is JWT payload, not the token itself
    //   user,
    //   account,
    //   profile,
    //   trigger,
    //   session
    // }
    // On the first successful sign-in, NextAuth has just authenticated the user. 
    // It passes that authenticated user object into the callback as user. That lets you copy fields from user into the JWT:
    
    // In the jwt callback, NextAuth passes a plain JavaScript object, not the raw encoded cookie string.
    // jwt is only called when the JWT is valid or the user first logs in.
    // when user first logs in, user property is available.
    /**
     * Runs the jwt logic for this module.
     *
     * @param token 
     * First Login in
     * - NextAuth creates a default token payload before calling your callback
     * - {
        name: user.name,
        email: user.email,
        picture: user.image,
        sub: user.id, sub is a standard claim that identifies who the token is about.
      }
      So on first login, token is not empty unless the user object has none of those fields.
    * Later Session Request With Valid Cookie, NextAuth decrypts/decodes the existing cookie token and passes that payload in:
      
     * @param user - the user object is the result of the authorize() function in the credentials provider.
     *
     * @returns The result used by the surrounding flow.
     */
    async jwt({ token, user }) {
      // Usually, user only exists on the first successful login.
      // We create the payload for the JWT from the user object when the user first logs in.
      if (user?.id) { // if the user object is available (i.e., on first login)
        // Save the user's id in the token so it can be used later in the session callback.
        token.userId = user.id;
        // Save whether the user has a verified email.
        token.verifiedEmail = user.verifiedEmail === true;
      }
      // The token returned from the jwt callback is passed back into NextAuth’s internal JWT flow, 
      // and then it is available to the following session callback as token.
      // return the payload object NextAuth should put into the JWT.
      return token;
    },
    // The session callback controls what data is available to the frontend through useSession/getSession.
    // It receives the token created by the jwt callback.
    // session argument: The default session object NextAuth is about to send to the frontend.
    // token argument:The JWT token data
    /**
     * Runs the session logic for this module.
     *
     * @param session, token - Input used by session.
     *
     * @returns The result used by the surrounding flow.
     */
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

      // probably returned to, depends how the session is requested.
      // useSession()
      // getSession()
      // getServerSession(authOptions)
      // fetch("/api/auth/session")
      return session;
    },
  },
  // Specify a custom sign-in page URL to route users to when they need to log in.
  // eg http://localhost:3001/login
  // when NextAuth needs to send a user to sign in, it redirects them to: /login
  // NextAuth knows to send the user to /login when something asks NextAuth for authentication 
  // // and there is no valid session/token.


  // Without it, NextAuth would use its default page at something like:
  // http://localhost:3001/api/auth/signin

  pages: { signIn: "/login" },
};
