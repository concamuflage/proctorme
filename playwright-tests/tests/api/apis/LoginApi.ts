import { BaseApi } from "./BaseApi";

export type LoginRequest = {
  email: string;
  password: string;
};

/**
 * Represents the login api abstraction used by this project.
 */
export class LoginApi extends BaseApi {
  /**
   * Runs the login logic for this module.
   *
   * @param body - Input used by login.
   *
   * @returns The result used by the surrounding flow.
   */
  login(body: LoginRequest) {
    return this.post("/api/auth/login", body);
  }
}
