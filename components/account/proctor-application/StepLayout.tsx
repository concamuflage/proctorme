"use client";

import React from "react";

/**
 * Generates option elements for select inputs that use the same value and label.
 *
 * @param options - Selectable values, for example `["Accountant", "Teacher"]`.
 * @returns Option elements, for example `<option value="Accountant">Accountant</option>`.
 */
export function generateOptions(options: string[]) {
  return options.map((option) => (
    <option key={option} value={option}>
      {option}
    </option>
  ));
}

/**
 * Renders one bordered proctor application step section.
 *
 * @param props - Section title and children, for example `{ title: "Profile basics", children: <Field /> }`.
 * @returns A form section with a heading and the supplied step fields.
 */
export function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 border-t border-zinc-100 pt-6 first:border-t-0 first:pt-0">
      <h2 className="text-sm font-semibold text-zinc-950">{title}</h2>
      {children}
    </section>
  );
}

/**
 * Renders a labeled form control with shared proctor application spacing.
 *
 * @param props - Field label, child control, and optional class name, for example `{ label: "Profession", children: <select /> }`.
 * @returns A label wrapper around the supplied input, select, or textarea.
 */
export function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`grid gap-2 text-sm font-medium text-zinc-700 ${className}`}>
      {label}
      {children}
    </label>
  );
}
