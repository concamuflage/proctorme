import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CartDrawer from "@/components/cart/CartDrawer";
import PageTitle from "@/components/layout/PageTitle";
import Providers from "@/app/providers";
import { SITE_NAME } from "@/lib/proctor";
import { publicGoogleAnalyticsId } from "@/lib/publicEnv";

// Public Google Analytics measurement ID used to enable page tracking.
// When undefined, Google Analytics scripts are not rendered.
const GOOGLE_ANALYTICS_ID = publicGoogleAnalyticsId;

// Configure the primary sans-serif font and expose its CSS variable.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Configure the monospace font used for code and technical content.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Default metadata applied to all pages unless overridden by a route.
export const metadata: Metadata = {
  title: SITE_NAME,
  description: "Book verified proctors for in-person interview sessions.",
};

/**
 * Renders the root layout component.
 *
 * @param children - The current route content that Next.js passes into this
 * layout. For example, when the user visits `/login`, Next.js renders
 * `app/login/page.tsx` and passes that page as `children`, conceptually like
 * `<RootLayout><LoginPage /></RootLayout>`.
 *
 * @returns The rendered UI for this component.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Load Google Analytics only when a measurement ID is configured. */}
        {GOOGLE_ANALYTICS_ID ? 
        (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GOOGLE_ANALYTICS_ID}');
              `}
            </Script>
          </>
        ) : null}
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* Global application providers (e.g. NextAuth SessionProvider, cart state, etc.). */}
        <Providers>
          {/* Synchronizes the browser tab title with the current route. */}
          <PageTitle />
          {/* Site-wide navigation header displayed on every page. */}
          <Header />
          {/* The active page content rendered by the current route segment. */}
          {children}
          {/* Site-wide footer displayed on every page. */}
          <Footer />
          {/* Global shopping cart drawer that can be opened from anywhere in the app. */}
          <CartDrawer />
        </Providers>
      </body>
    </html>
  );
}
