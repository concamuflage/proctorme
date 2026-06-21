"use client";

import React from "react";
import UploadField from "@/components/account/UploadField";
import { FormSection } from "@/components/account/proctor-application/StepLayout";

type IdentityAndProfileMediaStepProps = {
  governmentIdUrls: string[];
  imageUrls: string[];
  inputClassName: string;
  onGovernmentIdUpload: (file: File | null) => void;
  onProfileImageUpload: (file: File | null) => void;
  uploadingGovernmentId: boolean;
  uploadingProfileImage: boolean;
};

/**
 * Converts a stored profile image URL into a browser-readable link.
 *
 * @param url - Stored profile image URL, for example `gcs://bucket/proctor-applications/206/profile-images/headshot.png`.
 * @returns An app URL, for example `/api/account/proctor-application/profile-image-file?url=gcs%3A...`, or the original non-GCS URL.
 */
function profileImageHref(url: string) {
  return url.startsWith("gcs://")
    ? `/api/account/proctor-application/profile-image-file?url=${encodeURIComponent(url)}`
    : url;
}

/**
 * Converts a stored government ID URL into a browser-readable link.
 *
 * @param url - Stored government ID URL, for example `gcs://bucket/proctor-applications/206/government-ids/id.pdf`.
 * @returns An app URL, for example `/api/account/proctor-application/government-id-file?url=gcs%3A...`, or the original non-GCS URL.
 */
function governmentIdHref(url: string) {
  return url.startsWith("gcs://")
    ? `/api/account/proctor-application/government-id-file?url=${encodeURIComponent(url)}`
    : url;
}

/**
 * Renders Step 5 of the proctor application form.
 *
 * @param props - Uploaded media URLs and upload callbacks, for example `governmentIdUrls=["gcs://bucket/path/id.pdf"]`.
 * @returns The identity and profile media step UI while upload state is owned by the parent component.
 */
export default function IdentityAndProfileMediaStep({
  governmentIdUrls,
  imageUrls,
  inputClassName,
  onGovernmentIdUpload,
  onProfileImageUpload,
  uploadingGovernmentId,
  uploadingProfileImage,
}: IdentityAndProfileMediaStepProps) {
  return (
    <FormSection title="Identity and profile media">
      <UploadField
        accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
        helperLines={["Accepted formats: PDF, JPG, JPEG, PNG.", "Maximum file size: 5 MB."]}
        inputClassName={inputClassName}
        label="Government-issued ID"
        onFileSelect={onGovernmentIdUpload}
        uploadedFiles={governmentIdUrls.map((url, index) => ({
          href: governmentIdHref(url),
          label: governmentIdUrls.length > 1 ? `Government ID ${index + 1}` : "Government ID",
          title: "Government ID",
        }))}
        uploadingLabel={uploadingGovernmentId ? "Uploading government ID..." : null}
      />
      <UploadField
        accept="image/png,image/jpeg,image/webp"
        helperLines={["Accepted formats: JPG, JPEG, PNG, WebP."]}
        inputClassName={inputClassName}
        label="Profile images"
        onFileSelect={onProfileImageUpload}
        uploadedFiles={imageUrls.map((url, index) => ({
          href: profileImageHref(url),
          label: imageUrls.length > 1 ? `Image ${index + 1}` : "Image",
          title: "Profile image",
        }))}
        uploadingLabel={uploadingProfileImage ? "Uploading profile image..." : null}
      />
    </FormSection>
  );
}
