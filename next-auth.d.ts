import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    verifiedEmail?: boolean;
  }

  interface Session {
    user?: DefaultSession["user"] & {
      id: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    verifiedEmail?: boolean;
  }
}
