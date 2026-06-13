import AboutPage from "@/app/about/page";

/**
 * Renders the  page.
 * This is index page component.
 * It is wrapped by the RootLayout component, which provides global UI and state to this page and all other pages in the app.
 * For this reason, 
 * @returns the index page content, which is the about page for now.
 */
export default function Home() {
  return <AboutPage />;
}
