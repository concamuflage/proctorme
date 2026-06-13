import type { APIRequestContext, APIResponse } from "@playwright/test";

// BaseApi is the parent class for API helper classes like SignupApi and AuthApi.
// It stores Playwright's API request context, which is the object that actually
// sends HTTP requests to the app during API tests.
/**
 * Stores the shared Playwright request context for API helper classes.
 */
export class BaseApi {
  protected readonly request: APIRequestContext;

  // `protected` means child classes can use `request`, but test files should not
  // reach into it directly. They should call methods like signup() or login().
  constructor(request: APIRequestContext) {
    this.request = request;
  }

  /**
   * Sends a JSON POST request using the shared Playwright request context.
   *
   * @param path - API route path relative to the request context base URL.
   * @param body - JSON payload sent to the route.
   *
   * @returns The API response so tests can assert status and payload.
   */
  protected post(path: string, body: unknown): Promise<APIResponse> {
    
    // this.request.post() returns a Promise<APIResponse>
    return this.request.post(path, {
      // Playwright serializes this object as the request JSON body.
      data: body,
      // Tell the backend that the request body is JSON.
      headers: { "Content-Type": "application/json" },
    });
  }
}
