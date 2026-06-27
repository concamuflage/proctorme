import { NextResponse } from "next/server";
import { resolveSessionUserId } from "@/lib/server/sessionUser";
import {
  getProctorApplicationForUser,
  getProctorApplicationSchoolEmailValidationError,
  getProctorApplicationValidationError,
  getUserDateOfBirth,
  LOCKED_PROCTOR_APPLICATION_MESSAGE,
  normalizeProctorApplicationInput,
  type ProctorApplicationInput,
  saveProctorApplication,
  saveProctorApplicationDraft,
  type ProctorApplicationValidationError,
} from "@/lib/server/proctorApplicationStore";

/**
 * Describes the route-specific parts of a proctor application mutation.
 *
 * Example: POST supplies final-submit validation and a submit error message, while PATCH supplies the draft saver and no validator.
 */
type ProctorApplicationMutationOptions = {
  /** Error returned when the saver fails for an unexpected reason, for example `Unable to submit proctor application.` */
  fallbackError: string;
  /** Console label used when the saver throws, for example `proctor application draft save error`. */
  logLabel: string;
  /** Incoming HTTP request whose JSON body contains the application payload. */
  request: Request;
  /** Persists the normalized payload for the authenticated user. */
  saveApplication: (userId: number, input: ProctorApplicationInput) => Promise<unknown>;
  /** Optional final-submit validator; omitted for draft PATCH requests so partial drafts can save. */
  validateInput?: (input: ProctorApplicationInput) => ProctorApplicationValidationError | null;
};

/**
 * This function handles both POST (submit) and PATCH (save draft) requests for the proctor application.
 * In a POST request, this function is called with a validator to ensure the application is complete and valid before submission.
 * In a Patch request, this function is called without a validator, allowing partial drafts to be saved.
 * This function always validates the school email address, regardless of the request type.
 *
 * @param options - Mutation behavior, for example POST passes `validateProctorApplicationInput` while PATCH omits validation so incomplete drafts can save.
 * @returns A JSON response containing the saved application, a validation error, a locked-application conflict, or a generic save error. For example, an invalid school email returns `{ error: "School email address must end with .edu.", errorCode: "INVALID_SCHOOL_EMAIL" }`.
 */
async function handleProctorApplicationMutation({
  fallbackError,
  request,
  saveApplication,
  validateInput,
}: ProctorApplicationMutationOptions) {
  const userId = await resolveSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const input = normalizeProctorApplicationInput(payload);
  // Always validate the school email address, no matter a validateInput is provided or not
  const schoolEmailError = getProctorApplicationSchoolEmailValidationError(input);
  if (schoolEmailError) {
    // The stable code lets the wizard open Education without depending on wording intended for display.
    // Example: Step 1 can receive this response while saving a draft that contains `student@gmail.com` in Step 4.
    return NextResponse.json({ error: schoolEmailError.message, errorCode: schoolEmailError.errorCode }, { status: 400 });
  }
  // a validator is passed in for the final-submit (POST) request, but not for the draft-save (PATCH) request.
  const validationError = validateInput?.(input);
  if (validationError) {
    return NextResponse.json({ error: validationError.message, errorCode: validationError.errorCode }, { status: 400 });
  }

  try {
    // saveApplication is different for POST and P
    const application = await saveApplication(userId, input);
    return NextResponse.json({ application });
  } catch (error) {
    // Locked applications return a conflict for both submit and draft-save requests.
    // Example: POST or PATCH against a `pending` application returns 409 and keeps review data unchanged.
    if (error instanceof Error && error.message === LOCKED_PROCTOR_APPLICATION_MESSAGE) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: fallbackError }, { status: 500 });
  }
}

/**
 * Handles GET requests for the /api/account/proctor-application route.
 *
 * A successful response has the shape:
 * `{ application: ProctorApplication | null, dateOfBirth: "1990-01-01" | null }`.
 * For example, a new applicant with no saved draft receives `{ application: null, dateOfBirth: "1990-01-01" }`.
 *
 * @returns A Next.js response for the request.
 */
export async function GET() {
  const userId = await resolveSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [application, dateOfBirth] = await Promise.all([
      getProctorApplicationForUser(userId),
      getUserDateOfBirth(userId),
    ]);
    return NextResponse.json({ application, dateOfBirth });
  } catch (error) {
    console.error("proctor application get error:", error);
    return NextResponse.json({ error: "Unable to load proctor application." }, { status: 500 });
  }
}

/**
 * Handles POST requests for the /api/account/proctor-application route.
 * When user submits a new proctor application, this is used.
 *
 * The POST route final-submits a complete application; for example, missing government ID URLs return a 400 validation error before save.
 *
 * @param request - Incoming final-submit request containing the proctor application JSON body.
 *
 * @returns A Next.js response for the request.
 */
export async function POST(request: Request) {
  return handleProctorApplicationMutation({
    fallbackError: "Unable to submit proctor application.",
    logLabel: "proctor application save error",
    request,
    saveApplication: saveProctorApplication,
    validateInput: getProctorApplicationValidationError,
  });
}

/**
 * Handles PATCH requests for the /api/account/proctor-application route.
 * When user saves a draft of their proctor application, this is used.
 * Whenever user clicks continue/next step, a draft is saved. This route doesn't validate the form data before saving it.
 *
 * The PATCH route saves drafts without final-submit validation; for example, an applicant can save Step 1 before uploading government ID files.
 *
 * @param request - Incoming draft-save request containing the partial proctor application JSON body.
 *
 * @returns A Next.js response for the request.
 */
export async function PATCH(request: Request) {
  return handleProctorApplicationMutation({
    fallbackError: "Unable to save proctor application draft.",
    logLabel: "proctor application draft save error",
    request,
    saveApplication: saveProctorApplicationDraft,
  });
}
