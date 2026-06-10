# Coding Requirements

These rules apply to all code changes in this repository.

## Documentation Comments

- Add documentation comments for every new or modified class.
- Add documentation comments for every new or modified function.
- Add clear code comments for new or updated implementation code when the logic,
  data flow, side effects, or business rule would not be obvious to a reader.
- For TypeScript and JavaScript, use JSDoc comments.

```ts
/**
 * Authenticates a local email/password user.
 *
 * @param payload - Request body containing email and password.
 * @returns A response-like object with status and body.
 */
export async function loginUser(payload: unknown) {
}
```

- Comments must explain purpose, inputs, return values, and important side effects.
- Code comments must be added near the relevant new or updated code, not only in
  the final response.
- Do not add vague comments that only repeat the code.

## Code Quality

- Keep changes scoped to the user request.
- Do not change behavior unless explicitly requested.
- Preserve existing project patterns.
- Avoid unrelated refactors.

## Response Requirements

After making code changes, Codex must include:

- Which files changed.
- Whether behavior changed.
- What verification was run, or why it was not run.
