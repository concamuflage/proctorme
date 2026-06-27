import type { APIResponse } from "@playwright/test";
import { BaseApi } from "./BaseApi";

/** Represents one education row accepted by the proctor application API. */
export type ProctorApplicationEducationRequest = {
  degree: string;
  school: string;
  major: string;
  startMonth: string;
  endMonth: string;
  diplomaUrl: string;
  schoolEmail: string;
  educationVerificationAuthorized: boolean;
  schoolEmailVerificationStatus: "not_provided" | "pending" | "verified";
};

/** Represents the JSON payload accepted by proctor application draft and submission requests. */
export type ProctorApplicationRequest = {
  profession: string;
  gender: string;
  ethnicity: string;
  dateOfBirth: string;
  bio: string;
  street: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  timezone: string;
  hourlyRate: number;
  minimumHours: number;
  maximumHours: number;
  education: ProctorApplicationEducationRequest[];
  imageUrls: string[];
  governmentIdUrls: string[];
};

/** Provides typed HTTP operations for the authenticated proctor application API. */
export class ProctorApplicationApi extends BaseApi {
  /**
   * Loads selectable values used to build a valid application payload.
   *
   * @returns The options endpoint response, for example one containing listed professions and states.
   */
  options(): Promise<APIResponse> {
    return this.request.get("/api/account/proctor-application/options");
  }

  /**
   * Loads cities for one listed state.
   *
   * @param stateCode - State code from the options response, for example `CA`.
   * @returns The state-specific city options response.
   */
  cities(stateCode: string): Promise<APIResponse> {
    return this.request.get(`/api/account/proctor-application/options?state=${encodeURIComponent(stateCode)}`);
  }

  /**
   * Saves an incomplete or complete application as a draft.
   *
   * @param body - Application values, for example a payload containing only a listed profession and blank remaining fields.
   * @returns The PATCH response from the proctor application route.
   */
  saveDraft(body: Partial<ProctorApplicationRequest>): Promise<APIResponse> {
    return this.request.patch("/api/account/proctor-application", {
      data: body,
      headers: { "Content-Type": "application/json" },
    });
  }

  /**
   * Submits a complete application for admin review.
   *
   * @param body - Complete valid application values assembled from listed options.
   * @returns The POST response from the proctor application route.
   */
  submit(body: ProctorApplicationRequest): Promise<APIResponse> {
    return this.request.post("/api/account/proctor-application", {
      data: body,
      headers: { "Content-Type": "application/json" },
    });
  }
}
