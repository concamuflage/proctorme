# Coding Requirements

These rules apply to all code changes in this repository.

## Documentation Comments

- Add documentation comments for every new or modified class.
- Add documentation comments for every new or modified function.
- Add clear code comments for new or updated implementation code when the logic,
  data flow, side effects, or business rule would not be obvious to a reader.
- For React components, explain each state value and setter introduced or
  modified: the purpose of the state, where the setter is called, and why those
  state transitions are needed.
- For TypeScript and JavaScript, use JSDoc comments.

```ts
/**
 * Authenticates a local email/password user.
 *
 * @param payload - Request body containing email and password.
 * @returns A response-like object with status and body.
 */
export async function checkCredentialsInDb(payload: unknown) {
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

## Git Workflow

- After making code changes and running the relevant verification, create a git
  commit automatically.
- Commit only the files changed for the current request. Do not include unrelated
  worktree changes.
- Use a concise commit message that describes the user-visible change, for
  example `Fix optional school email validation`.

## Response Requirements

After making code changes, Codex must include:

- Which files changed.
- Whether behavior changed.
- What verification was run, or why it was not run.
