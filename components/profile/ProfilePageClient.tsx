"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import EducationFields, { EMPTY_EDUCATION, type EducationInput } from "@/components/account/EducationFields";
import ProfileChangeRequestList from "@/components/profile/ProfileChangeRequestList";
import UsAddressFields from "@/components/account/UsAddressFields";
import { useCart } from "@/components/cart/CartContext";
import { formatUsd } from "@/lib/formatters";
import { SITE_NAME } from "@/lib/proctor";

type ProfileData = {
  user: {
    id: number;
    email: string;
    firstName: string | null;
    lastName: string | null;
    profession: string | null;
    gender: string | null;
    ethnicity: string | null;
    timezone: string | null;
    dateOfBirth: string | null;
    bio: string | null;
    imageUrls: string[];
  };
  educations: Array<{
    degree: string;
    school: string;
    major: string;
    startMonth: string;
    endMonth: string;
    schoolEmail: string;
    schoolEmailVerificationStatus: string;
  }>;
  organizationProfile: {
    organizationName: string;
    organizationEmail: string;
    organizationDomain: string;
    status: string;
    verificationExpiresAt: string | null;
    domainVerified: boolean;
  } | null;
  roles?: Array<{
    id: number;
    name: string;
  }>;
};

type OrderRecord = {
  items: Array<{
    proctorId: number;
    name: string;
    quantity: number;
    unitPriceUsd: number;
    color: string | null;
    size: string | null;
    weightKg: number | null;
    imageUrl: string | null;
    proctorExists: boolean;
  }>;
  id: number;
  invoiceNumber: string | null;
  paymentStatus: string;
  shipmentStatus: string;
  subtotalUsd: number;
  shippingUsd: number;
  totalUsd: number;
  paidAt: string | null;
  createdAt: string | null;
};

type ProctorApplication = {
  status: string;
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
  education: Array<{
    degree: string;
    school: string;
    major: string;
    startMonth?: string;
    endMonth?: string;
    diplomaUrls?: string[];
    schoolEmail?: string;
    schoolEmailVerificationStatus?: string;
  }>;
  imageUrls: string[];
  governmentIdUrls: string[];
};

type SubmittedEducation = {
  degree: string;
  school: string;
  major: string;
  startMonth: string;
  endMonth: string;
  diplomaUrls: string[];
  schoolEmail: string;
  educationVerificationAuthorized: boolean;
  schoolEmailVerificationStatus: string;
};

type AvailabilitySlotState = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

type AvailabilityDragState = {
  anchor: AvailabilitySlotState;
  appliedKeys: Set<string>;
  initialSelectedKeys: Set<string>;
  selected: boolean;
};

type ProctorSessionSettings = {
  hourlyRate: number;
  minimumHours: number;
  maximumHours: number;
  address: ProctorAddressSettings;
};

type ProctorAddressSettings = {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
};

type ProfileChangeRequest = {
  id: number;
  changeType: string;
  status: string;
  oldValues: Record<string, unknown>;
  newValues: Record<string, unknown>;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewNote: string;
};

type OrganizationApplicationRequest = {
  id: number;
  organizationName: string;
  organizationEmail: string;
  organizationDomain: string;
  status: string;
  reviewNote: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  verificationExpiresAt: string | null;
  organizationEmailVerificationStatus: string;
  domainVerified: boolean;
};

type StateOption = {
  name: string;
  code: string;
};

type ProfileSection =
  | "profile"
  | "change-organization"
  | "application"
  | "address"
  | "education"
  | "requests"
  | "availability"
  | "bookings"
  | "roles";

const ACTIVE_ROLE_STORAGE_KEY = "proctorme.activeRole";
const PROFILE_INPUT_CLASS = "w-full rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm text-zinc-900 outline-none focus:border-zinc-400";
const MAX_DIPLOMA_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_DIPLOMA_FILE_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);
const WEEK_DAYS = [
  { dayOfWeek: 0, label: "Sunday", shortLabel: "Sun" },
  { dayOfWeek: 1, label: "Monday", shortLabel: "Mon" },
  { dayOfWeek: 2, label: "Tuesday", shortLabel: "Tue" },
  { dayOfWeek: 3, label: "Wednesday", shortLabel: "Wed" },
  { dayOfWeek: 4, label: "Thursday", shortLabel: "Thu" },
  { dayOfWeek: 5, label: "Friday", shortLabel: "Fri" },
  { dayOfWeek: 6, label: "Saturday", shortLabel: "Sat" },
];
const AVAILABILITY_SLOTS = Array.from({ length: 17 }, (_, index) => {
  const startHour = index + 6;
  const endHour = startHour + 1;
  return {
    startTime: `${String(startHour).padStart(2, "0")}:00`,
    endTime: `${String(endHour).padStart(2, "0")}:00`,
    label: `${formatHour(startHour)} - ${formatHour(endHour)}`,
  };
});

/**
 * Formats hour for display.
 *
 * @param hour - Input used by format hour.
 *
 * @returns The formatted display value.
 */
function formatHour(hour: number) {
  const normalizedHour = hour % 24;
  if (normalizedHour === 0) return "12 AM";
  if (normalizedHour < 12) return `${normalizedHour} AM`;
  if (normalizedHour === 12) return "12 PM";
  return `${normalizedHour - 12} PM`;
}

/**
 * Formats date for display.
 *
 * @param value - Input used by format date.
 *
 * @returns The formatted display value.
 */
function formatDate(value: string | null) {
  if (!value) return "Pending";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

/**
 * Formats status for display.
 *
 * @param value - Input used by format status.
 *
 * @returns The formatted display value.
 */
function formatStatus(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || "Unknown";
}

/**
 * Formats name for display.
 *
 * @param profile - Input used by format name.
 *
 * @returns The formatted display value.
 */
function formatName(profile: ProfileData["user"]) {
  return [profile.firstName, profile.lastName].filter(Boolean).join(" ") || profile.email;
}

/**
 * Runs the profile image href logic for this module.
 *
 * @param url - Input used by profile image href.
 *
 * @returns The result used by the surrounding flow.
 */
function profileImageHref(url: string) {
  return url.startsWith("gcs://")
    ? `/api/proctor-files/profile-image?url=${encodeURIComponent(url)}`
    : url;
}

/**
 * Runs the diploma href logic for this module.
 *
 * @param url - Input used by diploma href.
 *
 * @returns The result used by the surrounding flow.
 */
function diplomaHref(url: string) {
  return url.startsWith("gcs://")
    ? `/api/account/proctor-application/diploma-file?url=${encodeURIComponent(url)}`
    : url;
}

/**
 * Formats role name for display.
 *
 * @param roleName - Input used by format role name.
 *
 * @returns The formatted display value.
 */
function formatRoleName(roleName: string) {
  if (roleName === "cooporate_user" || roleName === "corporate_user" || roleName === "interviewee") return "Organization user";
  return roleName
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/**
 * Checks whether corporate role name is true for this flow.
 *
 * @param roleName - Input used by is corporate role name.
 *
 * @returns True when the value satisfies the check.
 */
function isCorporateRoleName(roleName: string) {
  return roleName === "corporate_user" || roleName === "cooporate_user" || roleName === "interviewee";
}

/**
 * Runs the availability slot key logic for this module.
 *
 * @param slot - Input used by availability slot key.
 *
 * @returns The result used by the surrounding flow.
 */
function availabilitySlotKey(slot: Pick<AvailabilitySlotState, "dayOfWeek" | "startTime" | "endTime">) {
  return `${slot.dayOfWeek}-${slot.startTime}-${slot.endTime}`;
}

/**
 * Runs the availability range slots logic for this module.
 *
 * @param anchor - Input used by availability range slots.
 * @param current - Input used by availability range slots.
 *
 * @returns The result used by the surrounding flow.
 */
function availabilityRangeSlots(anchor: AvailabilitySlotState, current: AvailabilitySlotState) {
  const startDay = Math.min(anchor.dayOfWeek, current.dayOfWeek);
  const endDay = Math.max(anchor.dayOfWeek, current.dayOfWeek);
  const anchorTimeIndex = AVAILABILITY_SLOTS.findIndex((slot) => slot.startTime === anchor.startTime);
  const currentTimeIndex = AVAILABILITY_SLOTS.findIndex((slot) => slot.startTime === current.startTime);
  if (anchorTimeIndex < 0 || currentTimeIndex < 0) return [current];

  const startTimeIndex = Math.min(anchorTimeIndex, currentTimeIndex);
  const endTimeIndex = Math.max(anchorTimeIndex, currentTimeIndex);
  const slots: AvailabilitySlotState[] = [];

  for (const timeSlot of AVAILABILITY_SLOTS.slice(startTimeIndex, endTimeIndex + 1)) {
    for (const day of WEEK_DAYS) {
      if (day.dayOfWeek < startDay || day.dayOfWeek > endDay) continue;
      slots.push({
        dayOfWeek: day.dayOfWeek,
        startTime: timeSlot.startTime,
        endTime: timeSlot.endTime,
      });
    }
  }

  return slots;
}

/**
 * Renders the profile page client component.
 *
 * @param _props - Input used by profile page client.
 *
 * @returns The rendered UI for this component.
 */
export default function ProfilePageClient(_props: { initialSection?: string } = {}) {
  const { addItem } = useCart();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [organizationApplications, setOrganizationApplications] = useState<OrganizationApplicationRequest[]>([]);
  const [organizationApplicationsLoading, setOrganizationApplicationsLoading] = useState(false);
  const [organizationApplicationsError, setOrganizationApplicationsError] = useState<string | null>(null);
  const [profileOptions, setProfileOptions] = useState<{ professions: string[]; genders: string[]; ethnicities: string[]; timezones: string[]; degrees: string[]; schools: string[]; majors: string[] }>({
    professions: [],
    genders: [],
    ethnicities: [],
    timezones: [],
    degrees: [],
    schools: [],
    majors: [],
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [educationDraft, setEducationDraft] = useState<EducationInput[]>([{ ...EMPTY_EDUCATION }]);
  const [educationFormOpen, setEducationFormOpen] = useState(false);
  const [submittedEducation, setSubmittedEducation] = useState<SubmittedEducation[] | null>(null);
  const [educationSubmitting, setEducationSubmitting] = useState(false);
  const [educationMessage, setEducationMessage] = useState<string | null>(null);
  const [educationError, setEducationError] = useState<string | null>(null);
  const [uploadingEducationIndex, setUploadingEducationIndex] = useState<number | null>(null);
  const [activeRole, setActiveRole] = useState("");
  const [proctorApplication, setProctorApplication] = useState<ProctorApplication | null>(null);
  const [applicationLoading, setApplicationLoading] = useState(false);
  const [sessionSettings, setSessionSettings] = useState<ProctorSessionSettings>({
    hourlyRate: 0,
    minimumHours: 1,
    maximumHours: 1,
    address: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "United States",
    },
  });
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionSaving, setSessionSaving] = useState(false);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [availability, setAvailability] = useState<AvailabilitySlotState[]>([]);
  const [timezone, setTimezone] = useState("");
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilitySaving, setAvailabilitySaving] = useState(false);
  const [availabilityMessage, setAvailabilityMessage] = useState<string | null>(null);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<ProfileSection>(_props.initialSection === "orders" ? "bookings" : "profile");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    /**
     * Loads profile needed by this flow.
     *
     * @returns The result used by the surrounding flow.
     */
    async function loadProfile() {
      setLoading(true);
      setError(null);
      setOrdersError(null);
      try {
        const [profileResponse, ordersResponse] = await Promise.all([
          fetch("/api/profile", { cache: "no-store" }),
          fetch("/api/profile/orders", { cache: "no-store" }),
        ]);

        const profilePayload = await profileResponse.json().catch(() => null);
        const ordersPayload = await ordersResponse.json().catch(() => null);

        if (!profileResponse.ok) {
          throw new Error(profilePayload?.error || "Unable to load profile.");
        }
        if (cancelled) return;

        setProfile(profilePayload);
        if (ordersResponse.ok) {
          setOrders(Array.isArray(ordersPayload) ? ordersPayload : []);
        } else {
          setOrders([]);
          setOrdersError(ordersPayload?.error || "Unable to load orders.");
        }
        const roles = Array.isArray(profilePayload?.roles) ? profilePayload.roles : [];
        const savedRole = window.localStorage.getItem(ACTIVE_ROLE_STORAGE_KEY) || "";
        const nextActiveRole = roles.some((role: { name?: unknown }) => role.name === savedRole)
          ? savedRole
          : roles.length === 1
            ? String(roles[0].name || "")
            : "";
        setActiveRole(nextActiveRole);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load profile.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    /**
     * Loads profile options needed by this flow.
     *
     * @returns The result used by the surrounding flow.
     */
    async function loadProfileOptions() {
      const response = await fetch("/api/account/proctor-application/options", { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!cancelled && response.ok) {
        setProfileOptions({
          professions: Array.isArray(payload?.professions) ? payload.professions : [],
          genders: Array.isArray(payload?.genders) ? payload.genders : [],
          ethnicities: Array.isArray(payload?.ethnicities) ? payload.ethnicities : [],
          timezones: Array.isArray(payload?.timezones) ? payload.timezones : [],
          degrees: Array.isArray(payload?.degrees) ? payload.degrees : [],
          schools: Array.isArray(payload?.schools) ? payload.schools : [],
          majors: Array.isArray(payload?.majors) ? payload.majors : [],
        });
      }
    }

    void loadProfileOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Runs the save profile logic for this module.
   *
   * @param payload - Input used by save profile.
   *
   * @returns The result used by the surrounding flow.
   */
  async function saveProfile(payload: unknown) {
    setProfileSaving(true);
    setProfileMessage(null);
    setProfileError(null);
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const nextProfile = await response.json().catch(() => null);
      if (!response.ok) throw new Error(nextProfile?.error || "Unable to update profile.");
      setProfile(nextProfile);
      setProfileMessage("Profile saved.");
    } catch (saveError) {
      setProfileError(saveError instanceof Error ? saveError.message : "Unable to update profile.");
    } finally {
      setProfileSaving(false);
    }
  }

  /**
   * Updates education draft while preserving the surrounding form state.
   *
   * @param index - Input used by update education draft.
   * @param field - Input used by update education draft.
   * @param value - Input used by update education draft.
   *
   * @returns The result used by the surrounding flow.
   */
  function updateEducationDraft(index: number, field: keyof EducationInput, value: string) {
    setSubmittedEducation(null);
    setEducationDraft((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  }

  /**
   * Updates education draft boolean while preserving the surrounding form state.
   *
   * @param index - Input used by update education draft boolean.
   * @param field - Input used by update education draft boolean.
   * @param value - Input used by update education draft boolean.
   *
   * @returns The result used by the surrounding flow.
   */
  function updateEducationDraftBoolean(index: number, field: "educationVerificationAuthorized", value: boolean) {
    setSubmittedEducation(null);
    setEducationDraft((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  }

  /**
   * Runs the upload education diploma logic for this module.
   *
   * @param index - Input used by upload education diploma.
   * @param file - Input used by upload education diploma.
   *
   * @returns The result used by the surrounding flow.
   */
  async function uploadEducationDiploma(index: number, file: File | null) {
    if (!file) return;
    setEducationError(null);
    if (!ALLOWED_DIPLOMA_FILE_TYPES.has(file.type)) {
      setEducationError("Diploma must be a PDF, JPG, JPEG, or PNG file.");
      return;
    }
    if (file.size <= 0 || file.size > MAX_DIPLOMA_FILE_BYTES) {
      setEducationError("Diploma file must be 5 MB or smaller.");
      return;
    }
    setUploadingEducationIndex(index);
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/account/proctor-application/diploma-upload", {
      method: "POST",
      body: formData,
    });
    const payload = await response.json().catch(() => null);
    setUploadingEducationIndex(null);
    if (!response.ok || typeof payload?.url !== "string") {
      setEducationError(payload?.error ?? "Unable to upload diploma.");
      return;
    }
    setEducationDraft((current) => current.map((item, itemIndex) =>
      itemIndex === index ? { ...item, diplomaUrls: [...item.diplomaUrls, payload.url] } : item
    ));
    setSubmittedEducation(null);
  }

  /**
   * Builds education payload for this flow.
   *
   * @returns The result used by the surrounding flow.
   */
  function buildEducationPayload(): SubmittedEducation[] {
    return educationDraft.map((item) => ({
      degree: item.degree,
      school: item.school === "Other" ? item.customSchool.trim() : item.school,
      major: item.major === "Other" ? item.customMajor.trim() : item.major,
      startMonth: item.startMonth,
      endMonth: item.endMonth,
      diplomaUrls: item.diplomaUrls,
      schoolEmail: item.schoolEmail.trim(),
      educationVerificationAuthorized: item.educationVerificationAuthorized,
      schoolEmailVerificationStatus: item.schoolEmailVerificationStatus,
    }));
  }

  /**
   * Runs the submit education for review logic for this module.
   *
   * @returns The result used by the surrounding flow.
   */
  async function submitEducationForReview() {
    setEducationError(null);
    setEducationMessage(null);
    const nextEducation = buildEducationPayload();
    for (const item of nextEducation) {
      if (!item.degree || !item.school || !item.major) {
        setEducationError("Degree, school, and major are required for each education entry.");
        return;
      }
      if (item.diplomaUrls.length === 0) {
        setEducationError("A diploma upload is required for each education entry.");
        return;
      }
      if (!item.educationVerificationAuthorized) {
        setEducationError("Education verification authorization is required for each education entry.");
        return;
      }
    }

    setEducationSubmitting(true);
    const response = await fetch("/api/account/profile-change-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ changeType: "education", newValues: { education: nextEducation } }),
    });
    const payload = await response.json().catch(() => null);
    setEducationSubmitting(false);
    if (!response.ok) {
      setEducationError(payload?.error ?? "Unable to submit education for review.");
      return;
    }
    setSubmittedEducation(nextEducation);
    setEducationDraft([{ ...EMPTY_EDUCATION }]);
    setEducationFormOpen(false);
    setEducationMessage("Education submitted for admin review.");
  }

  useEffect(() => {
    if (activeRole !== "proctor") {
      setProctorApplication(null);
      setSessionMessage(null);
      setSessionError(null);
      setAvailabilityMessage(null);
      setAvailabilityError(null);
      return;
    }

    let cancelled = false;

    /**
     * Loads proctor application needed by this flow.
     *
     * @returns The result used by the surrounding flow.
     */
    async function loadProctorApplication() {
      setApplicationLoading(true);
      try {
        const response = await fetch("/api/account/proctor-application", { cache: "no-store" });
        const payload = await response.json().catch(() => null);
        if (!cancelled) {
          setProctorApplication(response.ok && payload?.application ? payload.application : null);
        }
      } finally {
        if (!cancelled) setApplicationLoading(false);
      }
    }

    void loadProctorApplication();

    return () => {
      cancelled = true;
    };
  }, [activeRole]);

  useEffect(() => {
    const hasCorporateRole = profile?.roles?.some((role) => isCorporateRoleName(role.name)) === true;
    if (activeRole !== "proctor" && (selectedSection === "application" || selectedSection === "address" || selectedSection === "education" || selectedSection === "availability")) {
      setSelectedSection("profile");
    }
    if (selectedSection === "requests" && activeRole !== "proctor" && !hasCorporateRole) {
      setSelectedSection("profile");
    }
    if (!isCorporateRoleName(activeRole) && selectedSection === "change-organization") {
      setSelectedSection("profile");
    }
  }, [activeRole, profile?.roles, selectedSection]);

  useEffect(() => {
    const hasCorporateRole = profile?.roles?.some((role) => isCorporateRoleName(role.name)) === true;
    if (!hasCorporateRole) {
      setOrganizationApplications([]);
      setOrganizationApplicationsError(null);
      return;
    }

    let cancelled = false;

    /**
     * Loads organization applications needed by this flow.
     *
     * @returns The result used by the surrounding flow.
     */
    async function loadOrganizationApplications() {
      setOrganizationApplicationsLoading(true);
      setOrganizationApplicationsError(null);
      try {
        const response = await fetch("/api/account/organization-application", { cache: "no-store" });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || "Unable to load organization verification requests.");
        if (!cancelled) {
          setOrganizationApplications(Array.isArray(payload?.applications) ? payload.applications : []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setOrganizationApplications([]);
          setOrganizationApplicationsError(loadError instanceof Error ? loadError.message : "Unable to load organization verification requests.");
        }
      } finally {
        if (!cancelled) setOrganizationApplicationsLoading(false);
      }
    }

    void loadOrganizationApplications();

    return () => {
      cancelled = true;
    };
  }, [profile?.roles]);

  useEffect(() => {
    if (activeRole !== "proctor") return;

    let cancelled = false;

    /**
     * Loads session settings needed by this flow.
     *
     * @returns The result used by the surrounding flow.
     */
    async function loadSessionSettings() {
      setSessionLoading(true);
      setSessionError(null);
      try {
        const response = await fetch("/api/account/proctor-session", { cache: "no-store" });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || "Unable to load session settings.");
        if (cancelled) return;

        setSessionSettings({
          hourlyRate: Number(payload?.hourlyRate) || 0,
          minimumHours: Number(payload?.minimumHours) || 1,
          maximumHours: Number(payload?.maximumHours) || 1,
          address: {
            street: typeof payload?.address?.street === "string" ? payload.address.street : "",
            city: typeof payload?.address?.city === "string" ? payload.address.city : "",
            state: typeof payload?.address?.state === "string" ? payload.address.state : "",
            zipCode: typeof payload?.address?.zipCode === "string" ? payload.address.zipCode : "",
            country: typeof payload?.address?.country === "string" ? payload.address.country : "United States",
          },
        });
      } catch (loadError) {
        if (!cancelled) setSessionError(loadError instanceof Error ? loadError.message : "Unable to load session settings.");
      } finally {
        if (!cancelled) setSessionLoading(false);
      }
    }

    void loadSessionSettings();

    return () => {
      cancelled = true;
    };
  }, [activeRole]);

  useEffect(() => {
    if (activeRole !== "proctor") return;

    let cancelled = false;

    /**
     * Loads availability needed by this flow.
     *
     * @returns The result used by the surrounding flow.
     */
    async function loadAvailability() {
      setAvailabilityLoading(true);
      setAvailabilityError(null);
      try {
        const response = await fetch("/api/account/proctor-availability", { cache: "no-store" });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || "Unable to load availability.");
        if (cancelled) return;

        const loadedAvailability = Array.isArray(payload?.availability) ? payload.availability : [];
        setTimezone(typeof payload?.timezone === "string" ? payload.timezone : "");
        setAvailability(loadedAvailability
          .map((item: { dayOfWeek?: unknown; startTime?: unknown; endTime?: unknown }) => ({
            dayOfWeek: Number(item.dayOfWeek),
            startTime: typeof item.startTime === "string" ? item.startTime.slice(0, 5) : "",
            endTime: typeof item.endTime === "string" ? item.endTime.slice(0, 5) : "",
          }))
          .filter((slot: AvailabilitySlotState) =>
            Number.isInteger(slot.dayOfWeek) &&
            slot.dayOfWeek >= 0 &&
            slot.dayOfWeek <= 6 &&
            slot.startTime &&
            slot.endTime
          ));
      } catch (loadError) {
        if (!cancelled) setAvailabilityError(loadError instanceof Error ? loadError.message : "Unable to load availability.");
      } finally {
        if (!cancelled) setAvailabilityLoading(false);
      }
    }

    void loadAvailability();

    return () => {
      cancelled = true;
    };
  }, [activeRole]);

  /**
   * Runs the save availability logic for this module.
   *
   * @returns The result used by the surrounding flow.
   */
  async function saveAvailability() {
    setAvailabilitySaving(true);
    setAvailabilityMessage(null);
    setAvailabilityError(null);
    try {
      const response = await fetch("/api/account/proctor-availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          availability: availability
            .map((slot) => ({
              dayOfWeek: slot.dayOfWeek,
              startTime: slot.startTime,
              endTime: slot.endTime,
            })),
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Unable to save availability.");
      setAvailabilityMessage("Availability saved.");
    } catch (saveError) {
      setAvailabilityError(saveError instanceof Error ? saveError.message : "Unable to save availability.");
    } finally {
      setAvailabilitySaving(false);
    }
  }

  /**
   * Runs the save session settings logic for this module.
   *
   * @param successMessage - Input used by save session settings.
   *
   * @returns The result used by the surrounding flow.
   */
  async function saveSessionSettings(successMessage = "Session settings saved.") {
    setSessionSaving(true);
    setSessionMessage(null);
    setSessionError(null);
    try {
      const response = await fetch("/api/account/proctor-session", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sessionSettings),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Unable to save session settings.");
      const addressReviewPending = payload?.addressReviewPending === true;
      setSessionSettings({
        hourlyRate: Number(payload?.hourlyRate) || sessionSettings.hourlyRate,
        minimumHours: Number(payload?.minimumHours) || sessionSettings.minimumHours,
        maximumHours: Number(payload?.maximumHours) || sessionSettings.maximumHours,
        address: addressReviewPending ? sessionSettings.address : {
          street: typeof payload?.address?.street === "string" ? payload.address.street : sessionSettings.address.street,
          city: typeof payload?.address?.city === "string" ? payload.address.city : sessionSettings.address.city,
          state: typeof payload?.address?.state === "string" ? payload.address.state : sessionSettings.address.state,
          zipCode: typeof payload?.address?.zipCode === "string" ? payload.address.zipCode : sessionSettings.address.zipCode,
          country: typeof payload?.address?.country === "string" ? payload.address.country : sessionSettings.address.country,
        },
      });
      setSessionMessage(addressReviewPending ? "Address change submitted for admin review." : successMessage);
    } catch (saveError) {
      setSessionError(saveError instanceof Error ? saveError.message : "Unable to save session settings.");
    } finally {
      setSessionSaving(false);
    }
  }

  /**
   * Updates session settings while preserving the surrounding form state.
   *
   * @param patch - Input used by update session settings.
   *
   * @returns The result used by the surrounding flow.
   */
  function updateSessionSettings(patch: Partial<ProctorSessionSettings>) {
    setSessionSettings((current) => ({ ...current, ...patch }));
    setSessionMessage(null);
    setSessionError(null);
  }

  /**
   * Runs the edit profile change request logic for this module.
   *
   * @param request - Input used by edit profile change request.
   *
   * @returns The result used by the surrounding flow.
   */
  function editProfileChangeRequest(request: ProfileChangeRequest) {
    if (request.changeType === "education") {
      const rows = Array.isArray(request.newValues.education)
        ? request.newValues.education.filter((item): item is Record<string, unknown> => item !== null && typeof item === "object" && !Array.isArray(item))
        : [];
      setEducationDraft(rows.length > 0 ? rows.map((item) => ({
        ...EMPTY_EDUCATION,
        degree: typeof item.degree === "string" ? item.degree : "",
        school: typeof item.school === "string" && profileOptions.schools.includes(item.school) ? item.school : "Other",
        customSchool: typeof item.school === "string" && !profileOptions.schools.includes(item.school) ? item.school : "",
        major: typeof item.major === "string" && profileOptions.majors.includes(item.major) ? item.major : "Other",
        customMajor: typeof item.major === "string" && !profileOptions.majors.includes(item.major) ? item.major : "",
        startMonth: typeof item.startMonth === "string" ? item.startMonth : "",
        endMonth: typeof item.endMonth === "string" ? item.endMonth : "",
        diplomaUrls: Array.isArray(item.diplomaUrls) ? item.diplomaUrls.filter((url): url is string => typeof url === "string") : [],
        schoolEmail: typeof item.schoolEmail === "string" ? item.schoolEmail : "",
        educationVerificationAuthorized: item.educationVerificationAuthorized === true,
        schoolEmailVerificationStatus: typeof item.schoolEmailVerificationStatus === "string" ? item.schoolEmailVerificationStatus : "not_provided",
      })) : [{ ...EMPTY_EDUCATION }]);
      setEducationMessage(null);
      setEducationError(null);
      setSubmittedEducation(null);
      setEducationFormOpen(true);
      setSelectedSection("education");
      return;
    }
    if (request.changeType !== "address") return;
    const nextAddress = {
      street: typeof request.newValues.street === "string" ? request.newValues.street : "",
      city: typeof request.newValues.city === "string" ? request.newValues.city : "",
      state: typeof request.newValues.state === "string" ? request.newValues.state : "",
      zipCode: typeof request.newValues.zipCode === "string" ? request.newValues.zipCode : "",
      country: typeof request.newValues.country === "string" ? request.newValues.country : "United States",
    };
    setSessionSettings((current) => ({
      ...current,
      address: nextAddress,
    }));
    setSessionMessage(null);
    setSessionError(null);
    setSelectedSection("address");
  }

  /**
   * Converts a value to ggle availability slot.
   *
   * @param slot - Input used by toggle availability slot.
   *
   * @returns The result used by the surrounding flow.
   */
  function toggleAvailabilitySlot(slot: AvailabilitySlotState) {
    setAvailability((current) => {
      const key = availabilitySlotKey(slot);
      const exists = current.some((item) => availabilitySlotKey(item) === key);
      if (exists) {
        return current.filter((item) => availabilitySlotKey(item) !== key);
      }

      return [...current, slot].sort((first, second) => {
        if (first.dayOfWeek !== second.dayOfWeek) return first.dayOfWeek - second.dayOfWeek;
        return first.startTime.localeCompare(second.startTime);
      });
    });
  }

  /**
   * Runs the set availability slot logic for this module.
   *
   * @param slot - Input used by set availability slot.
   * @param selected - Input used by set availability slot.
   *
   * @returns The result used by the surrounding flow.
   */
  function setAvailabilitySlot(slot: AvailabilitySlotState, selected: boolean) {
    setAvailability((current) => {
      const key = availabilitySlotKey(slot);
      const exists = current.some((item) => availabilitySlotKey(item) === key);
      if (selected && !exists) {
        return [...current, slot].sort((first, second) => {
          if (first.dayOfWeek !== second.dayOfWeek) return first.dayOfWeek - second.dayOfWeek;
          return first.startTime.localeCompare(second.startTime);
        });
      }
      if (!selected && exists) {
        return current.filter((item) => availabilitySlotKey(item) !== key);
      }
      return current;
    });
  }

  const isProctorRole = activeRole === "proctor";
  const isCorporateRole = isCorporateRoleName(activeRole);
  const hasCorporateRole = profile?.roles?.some((role) => isCorporateRoleName(role.name)) === true;
  const shouldPromptOrganizationVerification = isProctorRole && hasCorporateRole && !organizationApplicationsLoading && organizationApplications.length === 0;
  const profileSections: Array<{ id: ProfileSection; label: string }> = [
    { id: "profile", label: "Profile" },
    ...(isCorporateRole ? [
      { id: "change-organization" as const, label: "Change Organization" },
    ] : []),
    ...(isProctorRole ? [
      { id: "application" as const, label: "Application" },
      { id: "address" as const, label: "Address" },
      { id: "education" as const, label: "Education" },
      { id: "availability" as const, label: "Availability" },
    ] : []),
    ...(isProctorRole || hasCorporateRole ? [
      { id: "requests" as const, label: "Requests" },
    ] : []),
    { id: "bookings", label: "Bookings" },
    { id: "roles", label: "Roles" },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Account</h1>
          <p className="mt-2 text-sm text-zinc-600">Manage your proctor bookings and invoices.</p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-600">
            Loading account...
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {profile && !loading ? (
          <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
            <aside className="rounded-3xl border border-zinc-200 bg-white p-3 shadow-sm lg:sticky lg:top-6 lg:self-start">
              <nav className="grid gap-1">
                {profileSections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setSelectedSection(section.id)}
                    className={`rounded-2xl px-4 py-3 text-left text-sm font-medium ${
                      selectedSection === section.id
                        ? "bg-zinc-900 text-white"
                        : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950"
                    }`}
                  >
                    {section.label}
                  </button>
                ))}
              </nav>
            </aside>

            <div className="min-w-0">
              {shouldPromptOrganizationVerification ? (
                <OrganizationVerificationPrompt />
              ) : null}

              {selectedSection === "profile" ? (
                isCorporateRole ? (
                  <CorporateProfileOverview profile={profile} />
                ) : (
                  <ProfileOverview
                    error={profileError}
                    message={profileMessage}
                    onSaveSession={saveSessionSettings}
                    onSave={saveProfile}
                    onUpdateSession={updateSessionSettings}
                    options={profileOptions}
                    profile={profile}
                    saving={profileSaving}
                    sessionError={sessionError}
                    sessionLoading={sessionLoading}
                    sessionMessage={sessionMessage}
                    sessionSaving={sessionSaving}
                    sessionSettings={sessionSettings}
                  />
                )
              ) : null}

              {selectedSection === "change-organization" && isCorporateRole ? (
                <ChangeOrganizationSection profile={profile} />
              ) : null}

              {selectedSection === "application" && isProctorRole ? (
                <SectionCard title="Proctor application">
                  {applicationLoading ? (
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
                      Loading application...
                    </div>
                  ) : proctorApplication ? (
                    <>
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm">
                        <span className="font-medium text-zinc-900">Status</span>
                        <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-700">
                          {formatStatus(proctorApplication.status)}
                        </span>
                      </div>
                      <ProctorApplicationDetails application={proctorApplication} />
                    </>
                  ) : (
                    <Link
                      href="/account/proctor-verification"
                      className="block rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm font-medium text-zinc-800 hover:border-zinc-400"
                    >
                      Start proctor application
                    </Link>
                  )}
                </SectionCard>
              ) : null}

              {selectedSection === "address" && isProctorRole ? (
                <SectionCard title="Address">
                  <AddressEditor
                    onEditRequest={editProfileChangeRequest}
                    onSave={() => saveSessionSettings("Address saved.")}
                    onUpdate={updateSessionSettings}
                    sessionError={sessionError}
                    sessionLoading={sessionLoading}
                    sessionMessage={sessionMessage}
                    sessionSaving={sessionSaving}
                    settings={sessionSettings}
                  />
                </SectionCard>
              ) : null}

              {selectedSection === "education" && isProctorRole ? (
                <SectionCard title="Education">
                  <div className="grid gap-5">
                    <VerifiedEducationList educations={profile?.educations ?? []} />
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
                      New education records require admin review before they appear on your public proctor profile.
                    </div>
                    {submittedEducation ? (
                      <SubmittedEducationSummary education={submittedEducation} />
                    ) : !educationFormOpen ? (
                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={() => {
                            setEducationDraft([{ ...EMPTY_EDUCATION }]);
                            setEducationError(null);
                            setEducationMessage(null);
                            setEducationFormOpen(true);
                          }}
                          className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white"
                        >
                          Add education
                        </button>
                      </div>
                    ) : (
                      <EducationFields
                        degreeOptions={profileOptions.degrees}
                        education={educationDraft}
                        inputClassName={PROFILE_INPUT_CLASS}
                        majorOptions={profileOptions.majors}
                        onAddEducation={() => setEducationDraft((current) => [...current, { ...EMPTY_EDUCATION }])}
                        onBooleanChange={updateEducationDraftBoolean}
                        onChange={updateEducationDraft}
                        onDiplomaUpload={(index, file) => void uploadEducationDiploma(index, file)}
                        onRemoveEducation={(index) => setEducationDraft((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                        schoolOptions={profileOptions.schools}
                        siteName={SITE_NAME}
                        uploadingEducationIndex={uploadingEducationIndex}
                      />
                    )}
                    {educationError ? <div className="text-sm text-red-600">{educationError}</div> : null}
                    {educationMessage ? <div className="text-sm text-emerald-700">{educationMessage}</div> : null}
                    {educationFormOpen && !submittedEducation ? (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={submitEducationForReview}
                          disabled={educationSubmitting || uploadingEducationIndex !== null}
                          className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
                        >
                          {educationSubmitting ? "Submitting..." : "Submit education for review"}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </SectionCard>
              ) : null}

              {selectedSection === "requests" && (isProctorRole || hasCorporateRole) ? (
                <SectionCard title="Requests">
                  <VerificationRequestsSection
                    onEditRequest={editProfileChangeRequest}
                    organizationApplications={organizationApplications}
                    organizationApplicationsError={organizationApplicationsError}
                    organizationApplicationsLoading={organizationApplicationsLoading}
                    showProfileChangeRequests={isProctorRole}
                  />
                </SectionCard>
              ) : null}

              {selectedSection === "availability" && isProctorRole ? (
                <SectionCard title="Availability">
                  <AvailabilityEditor
                    availability={availability}
                    availabilityError={availabilityError}
                    availabilityLoading={availabilityLoading}
                    availabilityMessage={availabilityMessage}
                    availabilitySaving={availabilitySaving}
                    onSave={saveAvailability}
                    onSetSlot={setAvailabilitySlot}
                    onToggleSlot={toggleAvailabilitySlot}
                    timezone={timezone}
                  />
                </SectionCard>
              ) : null}

              {selectedSection === "bookings" ? (
                <BookingsSection
                  addItem={addItem}
                  orders={orders}
                  ordersError={ordersError}
                />
              ) : null}

              {selectedSection === "roles" ? (
                <RolesSection profile={profile} />
              ) : null}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

/**
 * Renders the proctor application details component.
 *
 * @param application - Input used by proctor application details.
 *
 * @returns The rendered UI for this component.
 */
function ProctorApplicationDetails({ application }: { application: ProctorApplication }) {
  const address = [application.street, application.city, application.state, application.zipCode, application.country]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="mt-3 rounded-2xl border border-zinc-200 bg-white p-4 text-sm">
      <div className="grid gap-3">
        <DetailRow label="Profession" value={application.profession} />
        <DetailRow label="Gender" value={application.gender} />
        <DetailRow label="Ethnicity" value={application.ethnicity} />
        <DetailRow label="Date of birth" value={application.dateOfBirth} />
        <DetailRow label="Current address" value={address} />
        <DetailRow label="IANA timezone" value={application.timezone} />
        <DetailRow label="Hourly rate" value={application.hourlyRate ? formatUsd(application.hourlyRate, 0) : ""} />
        <DetailRow label="Session length" value={`${application.minimumHours} - ${application.maximumHours} hours`} />
      </div>

      <div className="mt-4 border-t border-zinc-100 pt-4">
        <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">Self-introduction</div>
        <p className="mt-2 leading-6 text-zinc-700">{application.bio || "Not provided."}</p>
      </div>

      <div className="mt-4 border-t border-zinc-100 pt-4">
        <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">Education</div>
        <div className="mt-3 grid gap-3">
          {application.education.length > 0 ? (
            application.education.map((education, index) => (
              <div key={`${education.school}-${index}`} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                <div className="font-medium text-zinc-900">
                  {[education.degree, education.major].filter(Boolean).join(" · ") || "Education"}
                </div>
                <div className="mt-1 text-zinc-600">{education.school}</div>
                <div className="mt-1 text-xs text-zinc-500">
                  {[education.startMonth, education.endMonth].filter(Boolean).join(" - ") || "Dates not provided"}
                </div>
                {education.schoolEmail ? (
                  <div className="mt-2 text-xs text-zinc-600">
                    {education.schoolEmail} · {formatStatus(education.schoolEmailVerificationStatus || "pending")}
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <div className="text-sm text-zinc-500">No education records provided.</div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Renders the section card component.
 *
 * @param title, children - Input used by section card.
 *
 * @returns The rendered UI for this component.
 */
function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

/**
 * Renders the organization verification prompt component.
 *
 * @returns The rendered UI for this component.
 */
function OrganizationVerificationPrompt() {
  return (
    <div className="mb-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900 shadow-sm">
      <div className="font-semibold text-amber-950">Organization verification needed</div>
      <div className="mt-1">
        You already indicated that you want to book proctors as an organization user. Verify your organization before using organization booking features.
      </div>
      <Link href="/account/corporate-verification" className="mt-3 inline-flex rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white">
        Verify organization
      </Link>
    </div>
  );
}

/**
 * Renders the profile overview component.
 *
 * @param error,
  message,
  onSaveSession,
  onSave,
  onUpdateSession,
  options,
  profile,
  saving,
  sessionError,
  sessionLoading,
  sessionMessage,
  sessionSaving,
  sessionSettings, - Input used by profile overview.
 *
 * @returns The rendered UI for this component.
 */
function ProfileOverview({
  error,
  message,
  onSaveSession,
  onSave,
  onUpdateSession,
  options,
  profile,
  saving,
  sessionError,
  sessionLoading,
  sessionMessage,
  sessionSaving,
  sessionSettings,
}: {
  error: string | null;
  message: string | null;
  onSaveSession: () => Promise<void>;
  onSave: (payload: unknown) => Promise<void>;
  onUpdateSession: (patch: Partial<ProctorSessionSettings>) => void;
  options: { professions: string[]; genders: string[]; ethnicities: string[]; timezones: string[] };
  profile: ProfileData;
  saving: boolean;
  sessionError: string | null;
  sessionLoading: boolean;
  sessionMessage: string | null;
  sessionSaving: boolean;
  sessionSettings: ProctorSessionSettings;
}) {
  const user = profile.user;
  const [profession, setProfession] = useState(user.profession || "");
  const [gender, setGender] = useState(user.gender || "");
  const [ethnicity, setEthnicity] = useState(user.ethnicity || "");
  const [profileTimezone, setProfileTimezone] = useState(user.timezone || "");
  const [dateOfBirth, setDateOfBirth] = useState(user.dateOfBirth || "");
  const [bio, setBio] = useState(user.bio || "");
  const [imageUrls, setImageUrls] = useState<string[]>(user.imageUrls || []);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setProfession(profile.user.profession || "");
    setGender(profile.user.gender || "");
    setEthnicity(profile.user.ethnicity || "");
    setProfileTimezone(profile.user.timezone || "");
    setDateOfBirth(profile.user.dateOfBirth || "");
    setBio(profile.user.bio || "");
    setImageUrls(profile.user.imageUrls || []);
  }, [profile, options.professions]);

  /**
   * Runs the upload profile image logic for this module.
   *
   * @param file - Input used by upload profile image.
   *
   * @returns The result used by the surrounding flow.
   */
  async function uploadProfileImage(file: File | null) {
    if (!file) return;
    setUploadingImage(true);
    setLocalError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/account/proctor-application/profile-image-upload", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || typeof payload?.url !== "string") {
        throw new Error(payload?.error || "Unable to upload profile image.");
      }
      setImageUrls([payload.url]);
    } catch (uploadError) {
      setLocalError(uploadError instanceof Error ? uploadError.message : "Unable to upload profile image.");
    } finally {
      setUploadingImage(false);
    }
  }

  /**
   * Runs the submit profile logic for this module.
   *
   * @param event - Input used by submit profile.
   *
   * @returns The result used by the surrounding flow.
   */
  async function submitProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);
    if (!profession || profession === "Other") {
      setLocalError("Choose a listed profession.");
      return;
    }
    await onSave({
      profession,
      gender,
      ethnicity,
      timezone: profileTimezone,
      dateOfBirth,
      bio,
      imageUrls,
    });
  }

  return (
    <SectionCard title="Profile">
      <form onSubmit={submitProfile} className="grid gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-medium text-zinc-700">
            First name
            <input value={user.firstName || ""} className={`${PROFILE_INPUT_CLASS} bg-zinc-50 text-zinc-500`} disabled />
          </label>
          <label className="grid gap-1 text-sm font-medium text-zinc-700">
            Last name
            <input value={user.lastName || ""} className={`${PROFILE_INPUT_CLASS} bg-zinc-50 text-zinc-500`} disabled />
          </label>
          <div className="text-xs leading-5 text-zinc-500 sm:col-span-2">
            Legal name changes are not self-service. Contact support if your legal name needs correction.
          </div>
          <label className="grid gap-1 text-sm font-medium text-zinc-700 sm:col-span-2">
            Email
            <input value={user.email} className={`${PROFILE_INPUT_CLASS} bg-zinc-50 text-zinc-500`} disabled />
          </label>
          <div className="grid gap-1 text-sm font-medium text-zinc-700">
            Profession
            <select value={profession} onChange={(event) => setProfession(event.target.value)} className={PROFILE_INPUT_CLASS} required>
              <option value="">Select a profession</option>
              {options.professions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <label className="grid gap-1 text-sm font-medium text-zinc-700">
            Gender
            <select value={gender} onChange={(event) => setGender(event.target.value)} className={PROFILE_INPUT_CLASS} required>
              <option value="">Select a gender</option>
              {options.genders.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium text-zinc-700">
            Date of birth
            <input type="date" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} className={PROFILE_INPUT_CLASS} required />
          </label>
          <label className="grid gap-1 text-sm font-medium text-zinc-700">
            Ethnicity
            <select value={ethnicity} onChange={(event) => setEthnicity(event.target.value)} className={PROFILE_INPUT_CLASS} required>
              <option value="">Select ethnicity</option>
              {options.ethnicities.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium text-zinc-700">
            IANA timezone
            <select value={profileTimezone} onChange={(event) => setProfileTimezone(event.target.value)} className={PROFILE_INPUT_CLASS} required>
              <option value="">Select a timezone</option>
              {options.timezones.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="grid gap-1 text-sm font-medium text-zinc-700">
          Self-introduction
          <textarea
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            className={`${PROFILE_INPUT_CLASS} min-h-28 resize-y`}
            placeholder="Introduce yourself, your proctoring experience, exam environments, and strengths."
          />
        </label>

        <div className="grid gap-3">
          <div className="text-sm font-medium text-zinc-700">Profile image</div>
          {imageUrls[0] ? (
            <div className="flex h-40 w-32 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
              <img
                src={profileImageHref(imageUrls[0])}
                alt={`${formatName(user)} profile`}
                className="h-full w-full object-contain"
              />
            </div>
          ) : null}
          <div className="text-xs leading-5 text-zinc-500">
            Uploading a new photo will replace the current profile photo after you save.
          </div>
          <label className="grid cursor-pointer gap-2 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-5 text-center hover:border-zinc-500 hover:bg-white">
            <span className="text-sm font-medium text-zinc-900">
              {uploadingImage ? "Uploading..." : imageUrls[0] ? "Upload replacement photo" : "Upload profile photo"}
            </span>
            <span className="text-xs text-zinc-500">
              JPG, PNG, or WebP. The new photo replaces the current one after you save.
            </span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => void uploadProfileImage(event.target.files?.[0] ?? null)}
              className="sr-only"
            />
          </label>
          {uploadingImage ? <div className="text-sm text-zinc-500">Uploading profile image...</div> : null}
        </div>

        {localError || error ? <div className="text-sm text-red-600">{localError || error}</div> : null}
        {message ? <div className="text-sm text-emerald-700">{message}</div> : null}

        <div className="flex justify-end">
          <button type="submit" disabled={saving || uploadingImage} className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-50">
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
      <div className="mt-6 border-t border-zinc-100 pt-5">
        <h3 className="text-sm font-semibold text-zinc-950">Session</h3>
        <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm leading-6 text-zinc-600">
          Changes to hourly rate or session length apply only to future bookings. Existing bookings keep the price and session terms that were saved when they were booked.
        </div>
        <div className="mt-4">
          <SessionEditor
            onSave={onSaveSession}
            onUpdate={onUpdateSession}
            sessionError={sessionError}
            sessionLoading={sessionLoading}
            sessionMessage={sessionMessage}
            sessionSaving={sessionSaving}
            settings={sessionSettings}
          />
        </div>
      </div>
    </SectionCard>
  );
}

/**
 * Renders the corporate profile overview component.
 *
 * @param profile - Input used by corporate profile overview.
 *
 * @returns The rendered UI for this component.
 */
function CorporateProfileOverview({ profile }: { profile: ProfileData }) {
  const user = profile.user;
  const organizationProfile = profile.organizationProfile;

  return (
    <SectionCard title="Organization profile">
      <div className="grid gap-5 text-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 font-medium text-zinc-700">
            First name
            <input value={user.firstName || ""} className={`${PROFILE_INPUT_CLASS} bg-zinc-50 text-zinc-500`} disabled />
          </label>
          <label className="grid gap-1 font-medium text-zinc-700">
            Last name
            <input value={user.lastName || ""} className={`${PROFILE_INPUT_CLASS} bg-zinc-50 text-zinc-500`} disabled />
          </label>
          <label className="grid gap-1 font-medium text-zinc-700 sm:col-span-2">
            Account email
            <input value={user.email} className={`${PROFILE_INPUT_CLASS} bg-zinc-50 text-zinc-500`} disabled />
          </label>
        </div>

        {organizationProfile ? (
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-base font-semibold text-zinc-950">{organizationProfile.organizationName}</div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                Verified organization user
              </span>
            </div>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-zinc-500">Organization email</dt>
                <dd className="mt-1 font-medium text-zinc-900">{organizationProfile.organizationEmail}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-zinc-500">Expires</dt>
                <dd className="mt-1 font-medium text-zinc-900">{organizationProfile.verificationExpiresAt ? formatDate(organizationProfile.verificationExpiresAt) : "Not provided"}</dd>
              </div>
            </dl>
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            Your organization profile is not verified yet. Submit an organization application before using corporate booking features.
            <div className="mt-3">
              <Link href="/account/corporate-verification" className="inline-flex rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white">
                Submit organization application
              </Link>
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

/**
 * Renders the change organization section component.
 *
 * @param profile - Input used by change organization section.
 *
 * @returns The rendered UI for this component.
 */
function ChangeOrganizationSection({ profile }: { profile: ProfileData }) {
  const organizationProfile = profile.organizationProfile;

  return (
    <SectionCard title="Change Organization">
      <div className="grid gap-5 text-sm">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 leading-6 text-amber-900">
          If you changed jobs, submit a new organization application. Your current organization access stays unchanged until an admin reviews and approves the new organization.
        </div>

        {organizationProfile ? (
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="text-xs uppercase tracking-[0.14em] text-zinc-500">Current organization</div>
            <div className="mt-2 text-base font-semibold text-zinc-950">{organizationProfile.organizationName}</div>
            <div className="mt-1 text-zinc-700">{organizationProfile.organizationEmail}</div>
            <div className="mt-2 text-xs text-zinc-500">
              {organizationProfile.verificationExpiresAt
                ? `Verification expires ${formatDate(organizationProfile.verificationExpiresAt)}`
                : "Verification expiration is not set."}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-zinc-600">
            No approved organization is currently connected to this account.
          </div>
        )}

        <div className="flex justify-center">
          <Link
            href="/account/corporate-verification"
            className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Start organization change
          </Link>
        </div>
      </div>
    </SectionCard>
  );
}

/**
 * Renders the roles section component.
 *
 * @param profile - Input used by roles section.
 *
 * @returns The rendered UI for this component.
 */
function RolesSection({ profile }: { profile: ProfileData }) {
  const roleNames = new Set((profile.roles ?? []).map((role) => role.name));
  const canAddProctor = !roleNames.has("proctor");
  const canAddCorporate = !roleNames.has("corporate_user") && !roleNames.has("cooporate_user");

  return (
    <SectionCard title="Roles">
      <div className="flex flex-wrap gap-2">
        {Array.isArray(profile.roles) && profile.roles.length > 0 ? (
          profile.roles.map((role) => (
            <span key={role.id} className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
              {formatRoleName(role.name)}
            </span>
          ))
        ) : (
          <span className="text-sm text-zinc-500">No roles assigned.</span>
        )}
      </div>
      <div className="mt-6 border-t border-zinc-100 pt-5">
        {profile.organizationProfile ? (
          <div className="mb-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-semibold text-zinc-950">{profile.organizationProfile.organizationName}</div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Verified organization</span>
            </div>
            <div className="mt-2 text-zinc-700">{profile.organizationProfile.organizationEmail}</div>
            <div className="mt-2 text-xs text-zinc-500">
              {profile.organizationProfile.verificationExpiresAt ? `Verification expires ${formatDate(profile.organizationProfile.verificationExpiresAt)}` : ""}
            </div>
          </div>
        ) : null}
        <h3 className="text-sm font-semibold">Add another role</h3>
        <div className="mt-3 grid gap-2 sm:max-w-sm">
          {canAddProctor ? (
            <Link
              href="/account/proctor-verification"
              className="rounded-xl border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-800 hover:border-zinc-400"
            >
              Become a proctor
            </Link>
          ) : null}
          {canAddCorporate ? (
            <Link
              href="/account/corporate-verification"
              className="rounded-xl border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-800 hover:border-zinc-400"
            >
              Register as organization user
            </Link>
          ) : null}
          {!canAddProctor && !canAddCorporate ? (
            <div className="text-sm text-zinc-500">No additional roles are available.</div>
          ) : null}
        </div>
      </div>
    </SectionCard>
  );
}

/**
 * Renders the bookings section component.
 *
 * @param addItem,
  orders,
  ordersError, - Input used by bookings section.
 *
 * @returns The rendered UI for this component.
 */
function BookingsSection({
  addItem,
  orders,
  ordersError,
}: {
  addItem: ReturnType<typeof useCart>["addItem"];
  orders: OrderRecord[];
  ordersError: string | null;
}) {
  return (
    <SectionCard title="Bookings">
      {orders.length === 0 ? (
        <div className={`rounded-2xl border p-4 text-sm ${ordersError ? "border-red-200 bg-red-50 text-red-700" : "border-zinc-200 bg-zinc-50 text-zinc-600"}`}>
          {ordersError ?? "No bookings yet."}
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <article key={order.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-sm font-semibold">
                    {order.invoiceNumber ? `Invoice ${order.invoiceNumber}` : `Booking #${order.id}`}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {formatDate(order.paidAt ?? order.createdAt)} · {order.paymentStatus}
                  </div>
                </div>
                <div className="text-sm font-semibold">{formatUsd(order.totalUsd, 2)}</div>
              </div>

              <div className="mt-4 space-y-3">
                {order.items.map((item) => (
                  <div
                    key={`${order.id}-${item.proctorId}`}
                    className="flex flex-col gap-1 text-sm sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-zinc-500">
                        Qty {item.quantity}
                        {item.color ? ` · ${item.color}` : ""}
                        {item.size ? ` · ${item.size}` : ""}
                      </div>
                    </div>
                    {item.proctorExists ? (
                      <button
                        type="button"
                        onClick={() =>
                          addItem({
                            id: `proctor-${item.proctorId}`,
                            name: item.name,
                            price: item.unitPriceUsd,
                            qty: item.quantity,
                            color: item.color,
                            size: item.size,
                            sessionHours: item.weightKg,
                            imageUrl: item.imageUrl,
                          })
                        }
                        className="text-left text-xs font-medium text-zinc-700 hover:text-zinc-950 sm:text-right"
                      >
                        Book again
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

/**
 * Renders the session editor component.
 *
 * @param onSave,
  onUpdate,
  sessionError,
  sessionLoading,
  sessionMessage,
  sessionSaving,
  settings, - Input used by session editor.
 *
 * @returns The rendered UI for this component.
 */
function SessionEditor({
  onSave,
  onUpdate,
  sessionError,
  sessionLoading,
  sessionMessage,
  sessionSaving,
  settings,
}: {
  onSave: () => void;
  onUpdate: (patch: Partial<ProctorSessionSettings>) => void;
  sessionError: string | null;
  sessionLoading: boolean;
  sessionMessage: string | null;
  sessionSaving: boolean;
  settings: ProctorSessionSettings;
}) {
  const hasInvalidValues =
    !Number.isInteger(settings.hourlyRate) ||
    settings.hourlyRate <= 0 ||
    !Number.isInteger(settings.minimumHours) ||
    settings.minimumHours <= 0 ||
    !Number.isInteger(settings.maximumHours) ||
    settings.maximumHours < settings.minimumHours;

  return (
    <div className="grid gap-5">
      {sessionLoading ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
          Loading session settings...
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="grid gap-2 text-sm font-medium text-zinc-700">
              Hourly rate
              <div className="flex items-center rounded-xl border border-zinc-200 bg-white px-3">
                <span className="text-zinc-500">$</span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={settings.hourlyRate || ""}
                  onChange={(event) => onUpdate({ hourlyRate: Number(event.target.value) })}
                  className="min-w-0 flex-1 border-0 bg-transparent px-2 py-3 text-sm text-zinc-900 outline-none"
                />
                <span className="text-xs font-medium text-zinc-500">USD</span>
              </div>
            </label>

            <label className="grid gap-2 text-sm font-medium text-zinc-700">
              Minimum hours per session
              <input
                type="number"
                min={1}
                step={1}
                value={settings.minimumHours || ""}
                onChange={(event) => onUpdate({ minimumHours: Number(event.target.value) })}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm text-zinc-900 outline-none"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-zinc-700">
              Maximum hours per session
              <input
                type="number"
                min={settings.minimumHours || 1}
                step={1}
                value={settings.maximumHours || ""}
                onChange={(event) => onUpdate({ maximumHours: Number(event.target.value) })}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm text-zinc-900 outline-none"
              />
            </label>
          </div>

          {hasInvalidValues ? (
            <div className="text-sm text-red-600">
              Hourly rate and session hours must be whole numbers, and maximum hours must be at least minimum hours.
            </div>
          ) : null}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onSave}
              disabled={sessionSaving || hasInvalidValues}
              className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {sessionSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </>
      )}

      {sessionError ? <div className="text-sm text-red-600">{sessionError}</div> : null}
      {sessionMessage ? <div className="text-sm text-emerald-700">{sessionMessage}</div> : null}
    </div>
  );
}

/**
 * Renders the address editor component.
 *
 * @param onEditRequest,
  onSave,
  onUpdate,
  sessionError,
  sessionLoading,
  sessionMessage,
  sessionSaving,
  settings, - Input used by address editor.
 *
 * @returns The rendered UI for this component.
 */
function AddressEditor({
  onEditRequest,
  onSave,
  onUpdate,
  sessionError,
  sessionLoading,
  sessionMessage,
  sessionSaving,
  settings,
}: {
  onEditRequest: (request: ProfileChangeRequest) => void;
  onSave: () => Promise<void> | void;
  onUpdate: (patch: Partial<ProctorSessionSettings>) => void;
  sessionError: string | null;
  sessionLoading: boolean;
  sessionMessage: string | null;
  sessionSaving: boolean;
  settings: ProctorSessionSettings;
}) {
  const [states, setStates] = useState<StateOption[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [cityChoice, setCityChoice] = useState("");
  const [customCity, setCustomCity] = useState("");
  const [changeRequests, setChangeRequests] = useState<ProfileChangeRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsError, setRequestsError] = useState<string | null>(null);
  const address = settings.address;
  const hasInvalidValues = !address.street || !address.city || !address.state || !address.zipCode;

  /**
   * Loads change requests needed by this flow.
   *
   * @returns The result used by the surrounding flow.
   */
  async function loadChangeRequests() {
    setRequestsLoading(true);
    setRequestsError(null);
    try {
      const response = await fetch("/api/account/profile-change-requests", { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "Unable to load profile change request history.");
      setChangeRequests(Array.isArray(payload?.requests) ? payload.requests : []);
    } catch (error) {
      setRequestsError(error instanceof Error ? error.message : "Unable to load profile change request history.");
    } finally {
      setRequestsLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    /**
     * Loads states needed by this flow.
     *
     * @returns The result used by the surrounding flow.
     */
    async function loadStates() {
      const response = await fetch("/api/account/proctor-application/options", { cache: "no-store" });
      const payload = await response.json().catch(() => null);
      if (!cancelled && response.ok && Array.isArray(payload?.states)) {
        setStates(payload.states);
      }
    }

    void loadStates();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void loadChangeRequests();
  }, []);

  useEffect(() => {
    if (!address.state) {
      setCities([]);
      return;
    }

    let cancelled = false;

    /**
     * Loads cities needed by this flow.
     *
     * @returns The result used by the surrounding flow.
     */
    async function loadCities() {
      const response = await fetch(`/api/account/proctor-application/options?state=${encodeURIComponent(address.state)}`, {
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null);
      if (!cancelled && response.ok && Array.isArray(payload?.cities)) {
        setCities(payload.cities.filter((city: unknown) => typeof city === "string" && city !== "Other"));
      }
    }

    void loadCities();

    return () => {
      cancelled = true;
    };
  }, [address.state]);

  useEffect(() => {
    if (!address.city) {
      setCityChoice("");
      setCustomCity("");
      return;
    }

    if (cities.length > 0 && !cities.includes(address.city)) {
      setCityChoice("Other");
      setCustomCity(address.city);
      return;
    }

    setCityChoice(address.city);
    setCustomCity("");
  }, [address.city, cities]);

  /**
   * Updates address while preserving the surrounding form state.
   *
   * @param patch - Input used by update address.
   *
   * @returns The result used by the surrounding flow.
   */
  function updateAddress(patch: Partial<ProctorAddressSettings>) {
    onUpdate({
      address: {
        ...address,
        ...patch,
        country: "United States",
      },
    });
  }

  /**
   * Updates city while preserving the surrounding form state.
   *
   * @param value - Input used by update city.
   *
   * @returns The result used by the surrounding flow.
   */
  function updateCity(value: string) {
    setCityChoice(value);
    if (value !== "Other") {
      setCustomCity("");
      updateAddress({ city: value });
    } else {
      updateAddress({ city: customCity });
    }
  }

  /**
   * Updates custom city while preserving the surrounding form state.
   *
   * @param value - Input used by update custom city.
   *
   * @returns The result used by the surrounding flow.
   */
  function updateCustomCity(value: string) {
    setCustomCity(value);
    updateAddress({ city: value });
  }

  /**
   * Runs the save address logic for this module.
   *
   * @returns The result used by the surrounding flow.
   */
  async function saveAddress() {
    await onSave();
    await loadChangeRequests();
  }

  return (
    <div className="grid gap-5">
      {sessionLoading ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
          Loading address...
        </div>
      ) : (
        <>
          <div>
            <div className="mb-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
              Addresses using a listed city update immediately. If you choose Other and enter a new city, an admin reviews it first so the city and timezone can be verified before it appears on your public profile.
            </div>
            <UsAddressFields
              city={cityChoice}
              cityOptions={cities}
              customCity={customCity}
              gridClassName="grid gap-4 sm:grid-cols-2"
              inputClassName="w-full rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm text-zinc-900 outline-none"
              onCityChange={updateCity}
              onCustomCityChange={updateCustomCity}
              onStateChange={(value) => updateAddress({ state: value, city: "" })}
              onStreetChange={(value) => updateAddress({ street: value })}
              onZipCodeChange={(value) => updateAddress({ zipCode: value })}
              state={address.state}
              stateOptions={states}
              street={address.street}
              streetFieldClassName="sm:col-span-2"
              zipCode={address.zipCode}
            />
          </div>

          {hasInvalidValues ? (
            <div className="text-sm text-red-600">
              Current address is required.
            </div>
          ) : null}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={saveAddress}
              disabled={sessionSaving || hasInvalidValues}
              className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {sessionSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </>
      )}

      {sessionError ? <div className="text-sm text-red-600">{sessionError}</div> : null}
      {sessionMessage ? <div className="text-sm text-emerald-700">{sessionMessage}</div> : null}
      <ProfileChangeRequestList
        error={requestsError}
        loading={requestsLoading}
        onEditRequest={onEditRequest}
        requests={changeRequests}
      />
    </div>
  );
}

/**
 * Renders the profile change requests section component.
 *
 * @param onEditRequest - Input used by profile change requests section.
 *
 * @returns The rendered UI for this component.
 */
function ProfileChangeRequestsSection({ onEditRequest }: { onEditRequest: (request: ProfileChangeRequest) => void }) {
  const [requests, setRequests] = useState<ProfileChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    /**
     * Loads requests needed by this flow.
     *
     * @returns The result used by the surrounding flow.
     */
    async function loadRequests() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/account/profile-change-requests", { cache: "no-store" });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || "Unable to load profile change request history.");
        if (!cancelled) setRequests(Array.isArray(payload?.requests) ? payload.requests : []);
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load profile change request history.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadRequests();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ProfileChangeRequestList
      error={error}
      loading={loading}
      onEditRequest={onEditRequest}
      requests={requests}
      withTopBorder={false}
    />
  );
}

/**
 * Renders the verification requests section component.
 *
 * @param onEditRequest,
  organizationApplications,
  organizationApplicationsError,
  organizationApplicationsLoading,
  showProfileChangeRequests, - Input used by verification requests section.
 *
 * @returns The rendered UI for this component.
 */
function VerificationRequestsSection({
  onEditRequest,
  organizationApplications,
  organizationApplicationsError,
  organizationApplicationsLoading,
  showProfileChangeRequests,
}: {
  onEditRequest: (request: ProfileChangeRequest) => void;
  organizationApplications: OrganizationApplicationRequest[];
  organizationApplicationsError: string | null;
  organizationApplicationsLoading: boolean;
  showProfileChangeRequests: boolean;
}) {
  return (
    <div className="grid gap-6">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-zinc-950">Organization verification requests</h3>
          <Link href="/account/corporate-verification" className="rounded-full border border-zinc-300 px-4 py-2 text-xs font-medium text-zinc-800 hover:border-zinc-500">
            New request
          </Link>
        </div>
        {organizationApplicationsLoading ? (
          <div className="mt-3 text-sm text-zinc-500">Loading organization verification requests...</div>
        ) : null}
        {organizationApplicationsError ? (
          <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{organizationApplicationsError}</div>
        ) : null}
        {!organizationApplicationsLoading && !organizationApplicationsError && organizationApplications.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
            No organization verification requests yet.
          </div>
        ) : null}
        {organizationApplications.length > 0 ? (
          <div className="mt-3 grid gap-3">
            {organizationApplications.map((application) => (
              <article key={application.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-zinc-950">{application.organizationName}</div>
                    <div className="mt-1 text-zinc-600">{application.organizationEmail}</div>
                    <div className="mt-1 text-xs text-zinc-500">
                      Submitted {formatDate(application.submittedAt)}
                      {application.reviewedAt ? ` · Reviewed ${formatDate(application.reviewedAt)}` : ""}
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      Email {formatStatus(application.organizationEmailVerificationStatus)}
                      {application.domainVerified ? " · Domain mapping found" : ""}
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                    application.status === "approved"
                      ? "bg-emerald-50 text-emerald-700"
                      : application.status === "rejected"
                        ? "bg-red-50 text-red-700"
                        : "bg-amber-50 text-amber-800"
                  }`}>
                    {formatStatus(application.status)}
                  </span>
                </div>
                {application.reviewNote ? (
                  <div className="mt-3 rounded-xl border border-zinc-200 bg-white p-3 text-sm text-zinc-700">
                    <span className="font-medium text-zinc-950">Note:</span> {application.reviewNote}
                  </div>
                ) : null}
                {application.status === "rejected" ? (
                  <div className="mt-3 flex justify-end">
                    <Link href="/account/corporate-verification" className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-medium text-white">
                      Submit again
                    </Link>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : null}
      </div>

      {showProfileChangeRequests ? (
        <div className="border-t border-zinc-100 pt-6">
          <h3 className="mb-3 text-sm font-semibold text-zinc-950">Profile change requests</h3>
          <ProfileChangeRequestsSection onEditRequest={onEditRequest} />
        </div>
      ) : null}
    </div>
  );
}

/**
 * Formats month value for display.
 *
 * @param value - Input used by format month value.
 *
 * @returns The formatted display value.
 */
function formatMonthValue(value: string) {
  if (!/^\d{4}-\d{2}$/.test(value)) return "";
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(Date.UTC(year, month - 1, 1)));
}

/**
 * Renders the submitted education summary component.
 *
 * @param education - Input used by submitted education summary.
 *
 * @returns The rendered UI for this component.
 */
function SubmittedEducationSummary({ education }: { education: SubmittedEducation[] }) {
  return (
    <div className="grid gap-3">
      {education.map((item, index) => (
        <article key={`${item.degree}-${item.school}-${index}`} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm">
          <div className="grid gap-3 md:grid-cols-3">
            <DetailRow label="Degree" value={item.degree} />
            <DetailRow label="School" value={item.school} />
            <DetailRow label="Major" value={item.major} />
            <DetailRow label="Start" value={formatMonthValue(item.startMonth) || "Not provided"} />
            <DetailRow label="End" value={formatMonthValue(item.endMonth) || "Not provided"} />
            <DetailRow label="School email" value={item.schoolEmail || "Not provided"} />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {item.diplomaUrls.length > 0 ? item.diplomaUrls.map((url, urlIndex) => (
              <a key={url} href={diplomaHref(url)} target="_blank" rel="noreferrer" className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-medium text-zinc-700 underline">
                Diploma {item.diplomaUrls.length > 1 ? urlIndex + 1 : ""}
              </a>
            )) : (
              <span className="text-xs text-zinc-500">No diploma uploaded.</span>
            )}
            <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-700">
              {item.educationVerificationAuthorized ? "Verification authorized" : "Verification not authorized"}
            </span>
            {item.schoolEmail ? (
              <span className="text-xs text-zinc-500">
                School email status: {item.schoolEmailVerificationStatus === "verified" ? "verified" : "pending"}
              </span>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}

/**
 * Renders the verified education list component.
 *
 * @param educations - Input used by verified education list.
 *
 * @returns The rendered UI for this component.
 */
function VerifiedEducationList({ educations }: { educations: NonNullable<ProfileData["educations"]> }) {
  return (
    <section className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-950">Verified education</h3>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
          {educations.length} verified
        </span>
      </div>
      {educations.length > 0 ? (
        <div className="grid gap-3">
          {educations.map((education, index) => (
            <article key={`${education.school}-${education.degree}-${index}`} className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-zinc-950">
                    {[education.degree, education.major].filter(Boolean).join(" - ") || "Education"}
                  </div>
                  <div className="mt-1 text-zinc-700">{education.school || "School not provided"}</div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {[formatMonthValue(education.startMonth), formatMonthValue(education.endMonth)].filter(Boolean).join(" - ") || "Dates not provided"}
                  </div>
                </div>
                <span className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-medium text-emerald-700">
                  Verified
                </span>
              </div>
              {education.schoolEmail ? (
                <div className="mt-3 text-xs text-zinc-600">
                  School email: {education.schoolEmail} · {formatStatus(education.schoolEmailVerificationStatus)}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
          No verified education records yet.
        </div>
      )}
    </section>
  );
}

/**
 * Renders the availability editor component.
 *
 * @param availability,
  availabilityError,
  availabilityLoading,
  availabilityMessage,
  availabilitySaving,
  onSave,
  onSetSlot,
  onToggleSlot,
  timezone, - Input used by availability editor.
 *
 * @returns The rendered UI for this component.
 */
function AvailabilityEditor({
  availability,
  availabilityError,
  availabilityLoading,
  availabilityMessage,
  availabilitySaving,
  onSave,
  onSetSlot,
  onToggleSlot,
  timezone,
}: {
  availability: AvailabilitySlotState[];
  availabilityError: string | null;
  availabilityLoading: boolean;
  availabilityMessage: string | null;
  availabilitySaving: boolean;
  onSave: () => void;
  onSetSlot: (slot: AvailabilitySlotState, selected: boolean) => void;
  onToggleSlot: (slot: AvailabilitySlotState) => void;
  timezone: string;
}) {
  const selectedSlots = new Set(availability.map(availabilitySlotKey));
  const [dragState, setDragState] = useState<AvailabilityDragState | null>(null);

  useEffect(() => {
    if (dragState === null) return;

    /**
     * Runs the stop dragging logic for this module.
     *
     * @returns The result used by the surrounding flow.
     */
    function stopDragging() {
      setDragState(null);
    }

    window.addEventListener("pointerup", stopDragging);
    return () => window.removeEventListener("pointerup", stopDragging);
  }, [dragState]);

  /**
   * Handles slot pointer down for this component.
   *
   * @param slot - Input used by handle slot pointer down.
   * @param isSelected - Input used by handle slot pointer down.
   *
   * @returns The result used by the surrounding flow.
   */
  function handleSlotPointerDown(slot: AvailabilitySlotState, isSelected: boolean) {
    const nextSelected = !isSelected;
    const slotKey = availabilitySlotKey(slot);
    setDragState({
      anchor: slot,
      appliedKeys: new Set([slotKey]),
      initialSelectedKeys: new Set(selectedSlots),
      selected: nextSelected,
    });
    onSetSlot(slot, nextSelected);
  }

  /**
   * Handles slot pointer enter for this component.
   *
   * @param slot - Input used by handle slot pointer enter.
   *
   * @returns The result used by the surrounding flow.
   */
  function handleSlotPointerEnter(slot: AvailabilitySlotState) {
    if (dragState === null) return;

    const nextSlots = availabilityRangeSlots(dragState.anchor, slot);
    const nextKeys = new Set(nextSlots.map(availabilitySlotKey));

    for (const key of dragState.appliedKeys) {
      if (nextKeys.has(key)) continue;
      const [dayOfWeek, startTime, endTime] = key.split("-");
      onSetSlot(
        { dayOfWeek: Number(dayOfWeek), startTime, endTime },
        dragState.initialSelectedKeys.has(key)
      );
    }

    for (const nextSlot of nextSlots) {
      onSetSlot(nextSlot, dragState.selected);
    }

    setDragState({
      ...dragState,
      appliedKeys: nextKeys,
    });
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onSave}
          disabled={availabilitySaving || availabilityLoading || !timezone}
          className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
        >
          {availabilitySaving ? "Saving..." : "Save"}
        </button>
      </div>

      {availabilityLoading ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-600">
          Loading availability...
        </div>
      ) : (
        <div className="grid gap-3">
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
            Times are shown in your current address timezone:{" "}
            <span className="font-medium text-zinc-950">{timezone || "not available"}</span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-zinc-200 select-none">
            <div className="grid min-w-[760px] grid-cols-[120px_repeat(7,minmax(84px,1fr))]">
              <div className="border-b border-r border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">
                Time
              </div>
              {WEEK_DAYS.map((day) => (
                <div
                  key={day.dayOfWeek}
                  className="border-b border-r border-zinc-200 bg-zinc-50 px-3 py-2 text-center text-xs font-semibold text-zinc-700 last:border-r-0"
                >
                  <span className="hidden sm:inline">{day.label}</span>
                  <span className="sm:hidden">{day.shortLabel}</span>
                </div>
              ))}

              {AVAILABILITY_SLOTS.map((timeSlot) => (
                <React.Fragment key={timeSlot.startTime}>
                  <div className="border-b border-r border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-600 last:border-b-0">
                    {timeSlot.label}
                  </div>
                  {WEEK_DAYS.map((day) => {
                    const slot = {
                      dayOfWeek: day.dayOfWeek,
                      startTime: timeSlot.startTime,
                      endTime: timeSlot.endTime,
                    };
                    const isSelected = selectedSlots.has(availabilitySlotKey(slot));

                    return (
                      <button
                        key={`${day.dayOfWeek}-${timeSlot.startTime}`}
                        type="button"
                        aria-pressed={isSelected}
                        onPointerDown={(event) => {
                          event.preventDefault();
                          handleSlotPointerDown(slot, isSelected);
                        }}
                        onPointerEnter={() => handleSlotPointerEnter(slot)}
                        onClick={(event) => {
                          if (event.detail === 0) onToggleSlot(slot);
                        }}
                        className={`min-h-10 border-b border-r border-zinc-200 px-2 py-2 text-xs font-medium last:border-r-0 ${
                          isSelected
                            ? "bg-zinc-900 text-white hover:bg-zinc-800"
                            : "bg-white text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                        }`}
                      >
                        {isSelected ? "Available" : ""}
                      </button>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="text-xs text-zinc-500">
            Select the one-hour slots when you are available. Selected slots are saved in your current address timezone.
          </div>
        </div>
      )}

      {availabilityError ? <div className="mt-3 text-sm text-red-600">{availabilityError}</div> : null}
      {availabilityMessage ? <div className="mt-3 text-sm text-emerald-700">{availabilityMessage}</div> : null}
    </div>
  );
}

/**
 * Renders the detail row component.
 *
 * @param label, value - Input used by detail row.
 *
 * @returns The rendered UI for this component.
 */
function DetailRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">{label}</div>
      <div className="mt-1 font-medium text-zinc-900">{value || "Not provided."}</div>
    </div>
  );
}
