import type { ReactNode } from "react";

type AlertTone = "error" | "success" | "warning" | "info";

type AlertMessageProps = {
  children: ReactNode;
  className?: string;
  id?: string;
  role: "alert" | "status" | "note";
  tone: AlertTone;
};

const TONE_CLASS_NAMES: Record<AlertTone, string> = {
  error: "border-red-200 bg-red-50 text-red-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  info: "border-zinc-200 bg-zinc-50 text-zinc-700",
};

/**
 * Renders a shared site message for errors, success notices, warnings, and neutral information.
 *
 * @param children - Message body, for example `Unable to save this section.`.
 * @param className - Optional spacing or layout classes, for example `mt-6`.
 * @param id - Optional DOM id used by forms or tests, for example `signup-error`.
 * @param role - Accessibility role, for example `alert` for errors or `status` for success notices.
 * @param tone - Message tone, for example `error` or `success`.
 * @returns A styled alert message element.
 */
export default function AlertMessage({ children, className = "", id, role, tone }: AlertMessageProps) { 
  // If className exists, add a space before it.
  const classNamePrefixedWithSpace = className ? ` ${className}` : "";
  return (
    <div
      id={id}
      role={role}
      className={`rounded-2xl border px-4 py-3 text-sm font-medium ${TONE_CLASS_NAMES[tone]}${classNamePrefixedWithSpace}`}
    >
      {children}
    </div>
  );
}
