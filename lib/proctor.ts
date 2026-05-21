export const SITE_NAME = "ProctorMe";

const PROCTOR_NAMES = [
  "Avery Chen",
  "Jordan Patel",
  "Morgan Reyes",
  "Taylor Brooks",
  "Casey Nguyen",
  "Riley Morgan",
  "Jamie Carter",
  "Drew Wallace",
  "Skyler Ahmed",
  "Quinn Bennett",
];

const SPECIALTIES = [
  "Technical interviews",
  "Campus hiring",
  "Healthcare credentialing",
  "Finance assessments",
  "Government screening",
  "Executive panels",
];

const LOCATION_TYPES = [
  "Client office",
  "University room",
  "Coworking suite",
  "Hotel conference room",
  "Testing center",
  "Remote-ready site",
];

const SESSION_LENGTHS = ["60 min", "90 min", "2 hr", "Half day", "Full day"];

function indexFromId(id: number | string | null | undefined, length: number) {
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || length <= 0) return 0;
  return Math.abs(Math.trunc(numericId)) % length;
}

function indexFromValue(value: string | number | null | undefined, length: number) {
  if (length <= 0) return 0;
  const text = String(value ?? "");
  if (!text) return 0;

  let hash = 0;
  for (const char of text) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash % length;
}

export function proctorName(id: number | string | null | undefined, rawName?: string | null) {
  const cleanedName = typeof rawName === "string" ? rawName.trim() : "";
  if (/proctor|monitor|invigilator|supervisor/i.test(cleanedName)) {
    return cleanedName;
  }
  return PROCTOR_NAMES[indexFromId(id, PROCTOR_NAMES.length)];
}

export function proctorSpecialty(id: number | string | null | undefined, rawStyle?: string | null) {
  const cleanedStyle = typeof rawStyle === "string" ? rawStyle.trim() : "";
  if (
    cleanedStyle &&
    !/hoodie|jacket|shirt|top|pants|shorts|tee|sweater|crew|fleece|jeans/i.test(cleanedStyle)
  ) {
    return cleanedStyle;
  }
  return SPECIALTIES[indexFromId(id, SPECIALTIES.length)];
}

export function proctorCredential(id: number | string | null | undefined, rawBrand?: string | null) {
  const cleanedBrand = typeof rawBrand === "string" ? rawBrand.trim() : "";
  if (
    cleanedBrand &&
    !/nike|levi'?s|adidas|puma|under armour|uniqlo|gap|zara/i.test(cleanedBrand)
  ) {
    return cleanedBrand;
  }
  return "ID-verified proctor";
}

export function proctorLocation(rawColor?: string | null, id?: number | string | null) {
  const cleanedColor = typeof rawColor === "string" ? rawColor.trim() : "";
  if (
    cleanedColor &&
    !/black|white|gray|grey|blue|red|green|yellow|brown|orange|pink|purple|navy|khaki/i.test(cleanedColor)
  ) {
    return cleanedColor;
  }
  return LOCATION_TYPES[indexFromValue(`${id ?? ""}-${cleanedColor}`, LOCATION_TYPES.length)];
}

export function proctorSessionLength(rawSize?: string | null, id?: number | string | null) {
  const cleanedSize = typeof rawSize === "string" ? rawSize.trim() : "";
  if (/\b(min|hour|hr|day|session)\b/i.test(cleanedSize)) {
    return cleanedSize;
  }
  return SESSION_LENGTHS[indexFromValue(`${id ?? ""}-${cleanedSize}`, SESSION_LENGTHS.length)];
}

export function proctorInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
