import RoleVerificationClient from "@/components/account/RoleVerificationClient";

/**
 * Renders the /account/corporate-verification page.
 *
 * @returns The page UI.
 */
export default function CorporateVerificationPage() {
  return <RoleVerificationClient role="corporate" />;
}
