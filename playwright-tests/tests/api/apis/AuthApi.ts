import { BaseApi } from "./BaseApi";

export type CredentialsSignInRequest = {
  email: string;
  password: string;
};

/**
 * Represents the NextAuth API abstraction used by auth-related API scenarios.
 */
export class AuthApi extends BaseApi {
  /**
   * Reads the CSRF token response required by NextAuth credential submissions.
   *
   * @returns The NextAuth CSRF API response.
   */
  csrf() {
    return this.request.get("/api/auth/csrf");
  }

  /**
   * Submits credentials through the real NextAuth credentials callback.
   * APIRequestContext automatically includes cookies from this request if SET-COOKIE is sent along the response
   * @param body - Email and password to submit to NextAuth.
   *
   * @returns The NextAuth credentials callback response.
   */
  async signInWithCredentials(body: CredentialsSignInRequest) {
    const csrfResponse = await this.csrf();
    const csrfPayload = await csrfResponse.json();

    return this.request.post("/api/auth/callback/credentials", {
      form: {
        csrfToken: csrfPayload.csrfToken,
        email: body.email,
        password: body.password,
        callbackUrl: "/",
        redirect: "false",
        json: "true",
      },
    });
  }

  /**
   * Reads the current NextAuth session using the request context cookies.
   * APIRequestContext automatically sends the cookies along the API request.
   */


  session() {
    return this.request.get("/api/auth/session");
  }
}
