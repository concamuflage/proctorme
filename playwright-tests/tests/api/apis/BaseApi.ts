import type { APIRequestContext, APIResponse } from "@playwright/test";

// BaseApi is the parent class for API helper classes like SignupApi and LoginApi.
// It stores Playwright's API request context, which is the object that actually
// sends HTTP requests to the app during API tests.
/**
 * Represents the base api abstraction used by this project.
 */
export class BaseApi {
  protected readonly request: APIRequestContext;

  // `protected` means child classes can use `request`, but test files should not
  // reach into it directly. They should call methods like signup() or login().
  constructor(request: APIRequestContext) {
    this.request = request;
  }

  // Send a JSON POST request.
  //
  // Example:
  //   this.post("/api/auth/login", { email, password })
  //
  // `path` is the API route.
  // `body` is the JSON payload sent to that route.
  // The returned APIResponse lets the test check status code and response body.
  /**
   * Runs the post logic for this module.
   *
   * @param path - Input used by post.
   * @param body - Input used by post.
   *
   * @returns The result used by the surrounding flow.
   */
  protected post(path: string, body: unknown): Promise<APIResponse> {
    
    // this.request.post() returns aPromise<APIResponse>
    return this.request.post(path, {
      // Playwright serializes this object as the request JSON body.
      data: body,
      // Tell the backend that the request body is JSON.
      headers: { "Content-Type": "application/json" },
    });
  }
}
