import { randomUUID } from "node:crypto";

export function generateGmailAlias(email: string) {
  const atIndex = email.indexOf("@");
  if (atIndex <= 0) throw new Error(`Signup email must be valid: ${email}`);

  const localPart = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);
  if (domain.toLowerCase() !== "gmail.com") {
    throw new Error("Generated signup email uses Gmail plus-addressing, so the base email must be a Gmail address.");
  }

  return `${localPart}+ui${randomUUID().replaceAll("-", "")}@gmail.com`;
}
