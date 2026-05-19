// NextAuth API route
//
// This file defines the NextAuth server endpoint at:
//   /api/auth/*
//
// IMPORTANT:
// - This code runs on the Next.js server (Node.js or serverless),
//   NOT in the browser.
// - This is a separate server/runtime from your backend `server.js`.
//
// Request flow:
// Browser -> /api/auth/* (NextAuth server)
//                     -> authorize() (in lib/auth.ts)
//                     -> fetch() -> backend server (server.js)
//
// NextAuth handles sessions, cookies, and callbacks here.


import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
