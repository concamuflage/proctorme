import assert from "node:assert/strict";
import { request } from "@playwright/test";
import { SignupApi, type SignupBody } from "../api/apis/SignupApi";
import { markUserEmailVerified, deleteUserRolesByEmail } from "./database/update/authUsers";
import { newSignupUser } from "./signupTestData";

/**
 * Creates a verified generated user with no assigned roles through API setup.
 *
 * @param baseURL - Application base URL used by the temporary API request context.
 * @param baseEmail - Optional Gmail address used to generate the user, for example `qa@gmail.com`.
 *
 * @returns The generated signup user that can be reused by later UI steps.
 */
export async function createVerifiedUserWithNoRoles(baseURL: string, baseEmail?: string): Promise<SignupBody> {
  const api = await request.newContext({ baseURL });
  const signupApi = new SignupApi(api);
  const user = newSignupUser(baseEmail);

  try {
    const response = await signupApi.signup(user);
    assert.equal(response.status(), 201);
    await markUserEmailVerified(user.email);
    return user;
  } finally {
    await api.dispose();
  }
}
