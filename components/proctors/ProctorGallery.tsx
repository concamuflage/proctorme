"use client";

import React, { useMemo, useState } from "react";
import { proctorInitials } from "@/lib/proctor";

// ProctorGallery shows a main proctor profile reference plus a list of thumbnails.
// The user can click thumbnails or use Previous/Next buttons to switch photos.
//
// Props:
// - photos: array of image URLs (strings)
// - alt: alt text for accessibility
// - initialIndex: which photo to show first (default 0)

export type ProctorGalleryProps = {
  photos: string[];
  alt: string;
  initialIndex?: number;
};

/**
 * Checks whether image url is true for this flow.
 *
 * @param value - Input used by is image url.
 *
 * @returns True when the value satisfies the check.
 */
function isImageUrl(value: string) {
  return /^https?:\/\//.test(value) || value.startsWith("/") || value.startsWith("data:image/") || value.startsWith("gcs://");
}

/**
 * Runs the profile image src logic for this module.
 *
 * @param url - Input used by profile image src.
 *
 * @returns The result used by the surrounding flow.
 */
function profileImageSrc(url: string) {
  return url.startsWith("gcs://")
    ? `/api/proctor-files/profile-image?url=${encodeURIComponent(url)}`
    : url;
}

/**
 * Renders the proctor gallery component.
 *
 * @param photos, alt, initialIndex = 0 - Input used by proctor gallery.
 *
 * @returns The rendered UI for this component.
 */
export default function ProctorGallery({ photos, alt, initialIndex = 0 }: ProctorGalleryProps) {
  // Defensive: filter out empty/non-string values.
  const safePhotos = useMemo(() => {
    return (Array.isArray(photos) ? photos : [])
      .filter((p) => typeof p === "string")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  }, [photos]);

  const initialSelectedIndex = Math.min(
    Math.max(initialIndex, 0),
    Math.max(safePhotos.length - 1, 0)
  );
  const [selectedIndex, setSelectedIndex] = useState<number>(initialSelectedIndex);
  const activeIndex = Math.min(Math.max(selectedIndex, 0), Math.max(safePhotos.length - 1, 0));

  const canNavigate = safePhotos.length > 1;
  const shouldUseTwoThumbnailColumns = safePhotos.length > 6;
  const activePhoto = safePhotos[activeIndex] ?? "";

  /**
   * Runs the go prev logic for this module.
   *
   * @returns The result used by the surrounding flow.
   */
  const goPrev = () => {
    if (!canNavigate) return;
    setSelectedIndex((prev) => (prev - 1 + safePhotos.length) % safePhotos.length);
  };

  /**
   * Runs the go next logic for this module.
   *
   * @returns The result used by the surrounding flow.
   */
  const goNext = () => {
    if (!canNavigate) return;
    setSelectedIndex((prev) => (prev + 1) % safePhotos.length);
  };

  return (
    // Outer grid layout: single column on mobile, switches to two columns at md breakpoint
    <div
      className={
        "grid grid-cols-1 gap-4 " +
        (shouldUseTwoThumbnailColumns ? "lg:grid-cols-[204px_1fr]" : "lg:grid-cols-[96px_1fr]")
      }
    >
      {/* 
        Thumbnails container:
        On mobile, it's a horizontal scrollable row to fit many thumbnails in limited width.
        On desktop (md and up), switches to vertical column with visible overflow.
      */}
      <div
        className={
          "order-2 flex gap-3 overflow-auto lg:order-1 lg:overflow-visible " +
          (shouldUseTwoThumbnailColumns
            ? "lg:grid lg:grid-cols-2 lg:gap-3 lg:content-start"
            : "lg:flex-col")
        }
      >
        {/*
          Render thumbnails using .map():
          Iterates over safePhotos array to create a button for each thumbnail.
          This is a common React pattern to render lists dynamically.
        */}
        {safePhotos.map((src, idx) => {
          // isActive indicates if this thumbnail is currently selected
          const isActive = idx === activeIndex;

          return (
            <button
              key={`${src}-${idx}`} // key prop is required by React to uniquely identify elements in a list for efficient updates
              type="button"
              onClick={() => setSelectedIndex(idx)}
              className={
                "relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border bg-white text-xs font-semibold text-zinc-700 " +
                (shouldUseTwoThumbnailColumns ? "" : " flex-none") +
                " " +
                (isActive ? "border-zinc-900" : "border-zinc-200 hover:border-zinc-400")
              }
              aria-label={`View proctor credential ${idx + 1}`}
            >
              {isImageUrl(src) ? (
                <img src={profileImageSrc(src)} alt={`${alt} ${idx + 1}`} className="h-full w-full object-contain" />
              ) : (
                `Ref ${idx + 1}`
              )}
            </button>
          );
        })}
      </div>

      {/* 
        Main image wrapper:
        Uses aspect-square to keep the container square regardless of width.
        This ensures consistent layout and image aspect ratio.
      */}
      <div className="order-1 lg:order-2">
        <div className="relative overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <div className="flex aspect-square w-full flex-col items-center justify-center bg-zinc-100 p-8 text-center">
            {isImageUrl(activePhoto) ? (
              <img src={profileImageSrc(activePhoto)} alt={alt} className="h-full w-full object-contain" />
            ) : (
              <>
                <div className="flex h-36 w-36 items-center justify-center rounded-full border border-zinc-300 bg-white text-5xl font-semibold text-zinc-900 shadow-sm">
                  {proctorInitials(alt)}
                </div>
                <div className="mt-6 max-w-sm">
                  <div className="text-lg font-semibold text-zinc-900">{alt}</div>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">
                    Verified proctor profile for controlled interview rooms, candidate check-in,
                    and session observation at the specified location.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* 
            Conditional rendering of navigation buttons:
            Only show if there is more than one image to navigate through.
          */}
          {canNavigate ? (
            <div className="absolute bottom-4 right-4 flex gap-2">
              <button
                type="button"
                onClick={goPrev}
                className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-900 shadow-sm hover:border-zinc-400"
                aria-label="Previous credential"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={goNext}
                className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-900 shadow-sm hover:border-zinc-400"
                aria-label="Next credential"
              >
                Next
              </button>
            </div>
          ) : null}
        </div>

        {/* Small helper text */}
        {canNavigate ? (
          <div className="mt-2 text-xs text-zinc-600">
            Credential reference {activeIndex + 1} of {safePhotos.length}
          </div>
        ) : null}
      </div>
    </div>
  );
}
