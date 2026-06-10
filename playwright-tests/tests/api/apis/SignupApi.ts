import { BaseApi } from "./BaseApi";

export type SignupBody = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

// SignupApi is a small wrapper around the signup endpoint.
// It extends BaseApi so it can reuse the shared JSON POST helper.
/**
 * Represents the signup api abstraction used by this project.
 */
export class SignupApi extends BaseApi {
  // Send a signup request to the backend.
  //
  // `body` must match the JSON shape expected by POST /api/auth/signup.
  // The test can use the returned response to check status code and payload.
  /**
   * Runs the signup logic for this module.
   *
   * @param body - Input used by signup.
   *
   * @returns The result used by the surrounding flow.
   */
  signup(body: SignupBody) {
    return this.post("/api/auth/signup", body);
  }
}
