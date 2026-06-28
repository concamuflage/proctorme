import { NextResponse } from "next/server";
import { getPrivateObjectReadUrl, isGcsUri, parseGcsUri } from "@/lib/server/gcsUploads";
import { resolveSessionUserId } from "@/lib/server/sessionUser";

export type ProctorApplicationFileFolder = "diplomas" | "government-ids" | "profile-images";

type ProctorApplicationFileRouteOptions = {
  /** Whether older `/uploads/...` values may redirect through the application. Example: Diploma records can use `/uploads/diplomas/file.pdf`. */
  allowLegacyUploads?: boolean;
  /** Folder owned by one applicant. Example: `diplomas` produces `proctor-applications/206/diplomas/`. */
  folder: ProctorApplicationFileFolder;
  /** Optional malformed-URL error override. Example: Government IDs return `Invalid file GCSURL.`. */
  invalidUrlError?: string;
  /** Default not-found error for invalid, unauthorized, or unavailable objects. Example: `Diploma file not found.`. */
  notFoundError: string;
  /** Optional ownership error override. Example: Government IDs return `This file is not yours`. */
  ownershipError?: string;
};

/**
 * Checks whether a GCS object uses one applicant's expected proctor-application file folder.
 *
 * @param objectName - GCS object path, for example `proctor-applications/206/profile-images/headshot.png`.
 * @param folder - Required file category, for example `profile-images`.
 * @returns True for a complete matching path; false for another category or a missing user/file segment.
 */
export function isProctorApplicationFilePath(
  objectName: string,
  folder: ProctorApplicationFileFolder,
) {
  const pathParts = objectName.split("/");
  return pathParts.length >= 4
    && pathParts[0] === "proctor-applications"
    && Boolean(pathParts[1])
    && pathParts[2] === folder
    && Boolean(pathParts.slice(3).join("/"));
}

/**
 * Authorizes one applicant-owned upload and redirects the browser to a temporary GCS read URL.
 *
 * @param request - File request containing a `url` query parameter, for example `?url=gcs%3A%2F%2Fbucket%2Fproctor-applications%2F206%2Fdiplomas%2Ffile.pdf`.
 * @param options - Route-specific folder and errors, for example `{ folder: "diplomas", allowLegacyUploads: true, ... }`.
 * @returns An authentication or not-found JSON response, a legacy local-upload redirect, or a temporary signed-URL redirect.
 */
export async function redirectToProctorApplicationFile(
  request: Request,
  options: ProctorApplicationFileRouteOptions,
) {

  const userId = await resolveSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url).searchParams.get("url") || "";
  // Legacy local uploads are supported only by routes that previously stored `/uploads/...` values.
  // Example: a diploma route redirects `/uploads/diplomas/file.pdf`, while a government ID route rejects it.
  if (options.allowLegacyUploads && url.startsWith("/uploads/")) {
    return NextResponse.redirect(new URL(url, request.url));
  }

  if (!isGcsUri(url)) {
    return NextResponse.json({ error: options.invalidUrlError ?? options.notFoundError }, { status: 404 });
  }

  const parsed = parseGcsUri(url);
  const ownedFolderPrefix = `proctor-applications/${userId}/${options.folder}/`;
  // Never sign a valid GCS URI until its object path is inside the authenticated applicant's folder.
  // Example: user 206 cannot request `proctor-applications/207/profile-images/headshot.png`.
  if (!parsed.objectName.startsWith(ownedFolderPrefix)) {
    return NextResponse.json({ error: options.ownershipError ?? options.notFoundError }, { status: 404 });
  }

  // If we've made it this far, the file is valid and owned by the user.
  // Generate a temporary signed URL for the file using the GCS service account that has the necessary permissions.
  
  const signedUrl = await getPrivateObjectReadUrl(url);
  if (!signedUrl) {
    return NextResponse.json({ error: options.notFoundError }, { status: 404 });
  }

  // browser can open the signed URL directly without knowing the credentials for the GCS service account.
  return NextResponse.redirect(signedUrl);
}
