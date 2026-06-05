// NextAuth API route
//
// This file defines the NextAuth server endpoint at:
//   /api/auth/*
//
// IMPORTANT:
// - This code runs on the Next.js server (Node.js or serverless),
//   NOT in the browser.
// Request flow:
// Browser -> /api/auth/* (NextAuth server) -> authorize() in lib/auth.ts
//
// NextAuth handles sessions, cookies, and callbacks here.


import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";


const handler = NextAuth(authOptions);

//the same handler will handle both GET and POST HTTP requests.
export { handler as GET, handler as POST };
