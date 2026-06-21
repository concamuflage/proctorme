import type { SignupBody } from "../api/apis/SignupApi";
import { generateGmailAlias } from "./emailTestData";
import { generatedUserPassword, testGmailBaseEmail } from "./testEnv";

/**
 * Creates a unique signup payload for API and UI test setup.
 *
 * @param baseEmail - Optional Gmail address used for plus-address generation, for example `qa@gmail.com`.
 *
 * @returns Signup request data with a Gmail plus-address alias and env-configured password.
 */
export function newSignupUser(baseEmail = testGmailBaseEmail): SignupBody {
  return {
    firstName: "Api",
    lastName: "Signup",
    email: generateGmailAlias(baseEmail),
    password: generatedUserPassword,
  };
}
