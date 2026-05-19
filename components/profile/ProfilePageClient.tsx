"use client";

import React, { useEffect, useState } from "react";
import { useCart } from "@/components/cart/CartContext";

type Measurement = {
  id: number;
  heightCm: number | null;
  chestCm: number | null;
  shoulderWidthCm: number | null;
  sleeveLengthCm: number | null;
  waistCm: number | null;
  hipCm: number | null;
  inseamCm: number | null;
};

type Address = {
  id: number;
  name: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
  isDefault: boolean;
  addressType: "shipping" | "billing";
};

type ProfileData = {
  user: {
    id: number;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  measurement: Measurement | null;
  shippingAddresses: Address[];
  billingAddresses: Address[];
};

type MeasurementForm = {
  heightFeet: string;
  heightInches: string;
  chestInches: string;
  shoulderWidthInches: string;
  sleeveLengthInches: string;
  waistInches: string;
  hipInches: string;
  inseamInches: string;
};

type AddressForm = {
  name: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
};

type OrderRecord = {
  items: Array<{
    productId: number;
    variantId: number;
    name: string;
    quantity: number;
    unitPriceUsd: number;
    color: string | null;
    size: string | null;
    weightKg: number | null;
    imageUrl: string | null;
    variantExists: boolean;
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

type ProfileSection = "overview" | "measurements" | "shipping" | "billing" | "orders";
type MeasurementFormErrors = Partial<Record<keyof MeasurementForm, string>>;
type AddressFormErrors = Partial<Record<keyof AddressForm, string>>;
const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
];

function emptyMeasurementForm(): MeasurementForm {
  return {
    heightFeet: "",
    heightInches: "",
    chestInches: "",
    shoulderWidthInches: "",
    sleeveLengthInches: "",
    waistInches: "",
    hipInches: "",
    inseamInches: "",
  };
}

function emptyAddressForm(): AddressForm {
  return {
    name: "",
    street: "",
    city: "",
    state: "",
    zipCode: "",
    country: "United States",
    phone: "",
  };
}

function measurementToForm(measurement: Measurement): MeasurementForm {
  const heightInches = measurement.heightCm == null ? null : cmToRoundedInches(measurement.heightCm);

  return {
    heightFeet: heightInches == null ? "" : String(Math.floor(heightInches / 12)),
    heightInches: heightInches == null ? "" : String(heightInches % 12),
    chestInches: measurement.chestCm == null ? "" : String(cmToRoundedInches(measurement.chestCm)),
    shoulderWidthInches:
      measurement.shoulderWidthCm == null ? "" : String(cmToRoundedInches(measurement.shoulderWidthCm)),
    sleeveLengthInches:
      measurement.sleeveLengthCm == null ? "" : String(cmToRoundedInches(measurement.sleeveLengthCm)),
    waistInches: measurement.waistCm == null ? "" : String(cmToRoundedInches(measurement.waistCm)),
    hipInches: measurement.hipCm == null ? "" : String(cmToRoundedInches(measurement.hipCm)),
    inseamInches: measurement.inseamCm == null ? "" : String(cmToRoundedInches(measurement.inseamCm)),
  };
}

function cmToRoundedInches(cm: number) {
  return Math.round(cm / 2.54);
}

function inchesToCm(inches: number) {
  return Math.round(inches * 2.54 * 10) / 10;
}

function formatHeightUs(cm: number | null) {
  if (cm == null) return "Not set";
  const totalInches = cmToRoundedInches(cm);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return `${feet}'${inches}"`;
}

function formatInches(cm: number | null) {
  return cm == null ? "Not set" : `${cmToRoundedInches(cm)} in`;
}

function formatCm(cm: number | null) {
  return cm == null ? "Not set" : `${cm} cm`;
}

function addressToForm(address: Address): AddressForm {
  return {
    name: address.name,
    street: address.street,
    city: address.city,
    state: address.state,
    zipCode: address.zipCode,
    country: address.country,
    phone: address.phone,
  };
}

function formatName(profile: ProfileData["user"]) {
  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim();
  return fullName || profile.email;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not paid yet";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatUsPhone(phone: string) {
  const trimmedPhone = phone.trim();
  if (!trimmedPhone) {
    return "";
  }

  return trimmedPhone.startsWith("+1") ? trimmedPhone : `+1 ${trimmedPhone}`;
}

function parseOptionalMeasurement(value: string | undefined, options?: { allowZero?: boolean }) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;

  const parsed = Number(trimmed);
  const isValid = options?.allowZero ? parsed >= 0 : parsed > 0;
  return Number.isFinite(parsed) && isValid ? parsed : NaN;
}

function validateMeasurementForm(values: MeasurementForm): MeasurementFormErrors {
  const errors: MeasurementFormErrors = {};
  const heightFeet = parseOptionalMeasurement(values.heightFeet);
  const heightInches = parseOptionalMeasurement(values.heightInches, { allowZero: true });
  const chestInches = parseOptionalMeasurement(values.chestInches);
  const shoulderWidthInches = parseOptionalMeasurement(values.shoulderWidthInches);
  const sleeveLengthInches = parseOptionalMeasurement(values.sleeveLengthInches);
  const waistInches = parseOptionalMeasurement(values.waistInches);
  const hipInches = parseOptionalMeasurement(values.hipInches);
  const inseamInches = parseOptionalMeasurement(values.inseamInches);
  const totalHeightInches =
    heightFeet == null && heightInches == null ? null : (heightFeet ?? 0) * 12 + (heightInches ?? 0);

  if (Number.isNaN(heightFeet)) errors.heightFeet = "Enter a valid height.";
  if (Number.isNaN(heightInches) || (heightInches != null && heightInches >= 12)) {
    errors.heightInches = "Enter inches from 0 to 11.";
  }
  if (totalHeightInches != null && (totalHeightInches < 36 || totalHeightInches > 96)) {
    errors.heightFeet = "Height must be between 3'0\" and 8'0\".";
  }
  if (Number.isNaN(chestInches)) errors.chestInches = "Enter a valid chest measurement.";
  if (chestInches != null && !Number.isNaN(chestInches) && (chestInches < 20 || chestInches > 80)) {
    errors.chestInches = "Chest must be between 20 and 80 inches.";
  }
  if (Number.isNaN(shoulderWidthInches)) errors.shoulderWidthInches = "Enter a valid shoulder width.";
  if (
    shoulderWidthInches != null &&
    !Number.isNaN(shoulderWidthInches) &&
    (shoulderWidthInches < 10 || shoulderWidthInches > 30)
  ) {
    errors.shoulderWidthInches = "Shoulder width must be between 10 and 30 inches.";
  }
  if (Number.isNaN(sleeveLengthInches)) {
    errors.sleeveLengthInches = "Enter a valid arm length.";
  }
  if (
    sleeveLengthInches != null &&
    !Number.isNaN(sleeveLengthInches) &&
    (sleeveLengthInches < 15 || sleeveLengthInches > 45)
  ) {
    errors.sleeveLengthInches = "Arm length must be between 15 and 45 inches.";
  }
  if (Number.isNaN(waistInches)) errors.waistInches = "Enter a valid waist measurement.";
  if (waistInches != null && !Number.isNaN(waistInches) && (waistInches < 18 || waistInches > 79)) {
    errors.waistInches = "Waist must be between 18 and 79 inches.";
  }
  if (Number.isNaN(hipInches)) errors.hipInches = "Enter a valid hip measurement.";
  if (hipInches != null && !Number.isNaN(hipInches) && (hipInches < 24 || hipInches > 87)) {
    errors.hipInches = "Hip must be between 24 and 87 inches.";
  }
  if (Number.isNaN(inseamInches)) errors.inseamInches = "Enter a valid inseam.";
  if (inseamInches != null && !Number.isNaN(inseamInches) && (inseamInches < 16 || inseamInches > 47)) {
    errors.inseamInches = "Inseam must be between 16 and 47 inches.";
  }

  return errors;
}

function measurementFormToCentimeters(values: MeasurementForm) {
  const heightFeet = parseOptionalMeasurement(values.heightFeet);
  const heightInches = parseOptionalMeasurement(values.heightInches, { allowZero: true });
  const chestInches = parseOptionalMeasurement(values.chestInches);
  const shoulderWidthInches = parseOptionalMeasurement(values.shoulderWidthInches);
  const sleeveLengthInches = parseOptionalMeasurement(values.sleeveLengthInches);
  const waistInches = parseOptionalMeasurement(values.waistInches);
  const hipInches = parseOptionalMeasurement(values.hipInches);
  const inseamInches = parseOptionalMeasurement(values.inseamInches);
  const totalHeightInches =
    heightFeet == null && heightInches == null ? null : (heightFeet ?? 0) * 12 + (heightInches ?? 0);

  return {
    heightCm: totalHeightInches == null ? null : inchesToCm(totalHeightInches),
    chestCm: chestInches == null ? null : inchesToCm(chestInches),
    shoulderWidthCm: shoulderWidthInches == null ? null : inchesToCm(shoulderWidthInches),
    sleeveLengthCm: sleeveLengthInches == null ? null : inchesToCm(sleeveLengthInches),
    waistCm: waistInches == null ? null : inchesToCm(waistInches),
    hipCm: hipInches == null ? null : inchesToCm(hipInches),
    inseamCm: inseamInches == null ? null : inchesToCm(inseamInches),
  };
}

function validateAddressForm(values: AddressForm): AddressFormErrors {
  const errors: AddressFormErrors = {};

  if (!values.name.trim()) errors.name = "Full name is required.";
  if (!values.phone.trim()) errors.phone = "Phone is required.";
  if (!values.street.trim()) errors.street = "Street is required.";
  if (!values.city.trim()) errors.city = "City is required.";
  if (!values.state.trim()) errors.state = "State is required.";
  if (!values.zipCode.trim()) errors.zipCode = "ZIP code is required.";

  return errors;
}

function AddressCard({
  address,
  onEdit,
  onDelete,
  deleting,
}: {
  address: Address;
  onEdit?: () => void;
  onDelete?: () => void;
  deleting?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-zinc-900">{address.name}</h3>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            {address.street}
            <br />
            {address.city}, {address.state} {address.zipCode}
            <br />
            {address.country}
            <br />
            {formatUsPhone(address.phone)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onEdit ? (
            <button
              type="button"
              onClick={onEdit}
              className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:border-zinc-500 hover:text-zinc-900"
            >
              Edit
            </button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              disabled={deleting}
              className="rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:border-red-300 hover:text-red-700 disabled:opacity-60"
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          ) : null}
          {address.isDefault ? (
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
              Default
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function AddressFormFields({
  values,
  onChange,
  errors,
  formError,
  submitLabel,
  onSubmit,
  saving,
  onCancel,
}: {
  values: AddressForm;
  onChange: (field: keyof AddressForm, value: string) => void;
  errors?: AddressFormErrors;
  formError?: string | null;
  submitLabel: string;
  onSubmit: () => void;
  saving: boolean;
  onCancel?: () => void;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-zinc-300 bg-zinc-50 p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm text-zinc-700">
          Full name
          <input
            value={values.name}
            onChange={(event) => onChange("name", event.target.value)}
            className={`mt-2 w-full rounded-2xl border bg-white px-3 py-2 text-sm text-zinc-900 ${
              errors?.name ? "border-red-300" : "border-zinc-200"
            }`}
          />
          {errors?.name ? <div className="mt-2 text-xs text-red-600">{errors.name}</div> : null}
        </label>
        <label className="text-sm text-zinc-700">
          Phone
          <div
            className={`mt-2 flex items-center overflow-hidden rounded-2xl border bg-white ${
              errors?.phone ? "border-red-300" : "border-zinc-200"
            }`}
          >
            <div className="border-r border-zinc-200 bg-zinc-100 px-3 py-2 text-sm text-zinc-600">
              +1
            </div>
            <input
              value={values.phone}
              onChange={(event) => onChange("phone", event.target.value)}
              className="w-full bg-white px-3 py-2 text-sm text-zinc-900 outline-none"
            />
          </div>
          {errors?.phone ? <div className="mt-2 text-xs text-red-600">{errors.phone}</div> : null}
        </label>
        <label className="text-sm text-zinc-700 md:col-span-2">
          Street
          <input
            value={values.street}
            onChange={(event) => onChange("street", event.target.value)}
            className={`mt-2 w-full rounded-2xl border bg-white px-3 py-2 text-sm text-zinc-900 ${
              errors?.street ? "border-red-300" : "border-zinc-200"
            }`}
          />
          {errors?.street ? <div className="mt-2 text-xs text-red-600">{errors.street}</div> : null}
        </label>
        <label className="text-sm text-zinc-700">
          City
          <input
            value={values.city}
            onChange={(event) => onChange("city", event.target.value)}
            className={`mt-2 w-full rounded-2xl border bg-white px-3 py-2 text-sm text-zinc-900 ${
              errors?.city ? "border-red-300" : "border-zinc-200"
            }`}
          />
          {errors?.city ? <div className="mt-2 text-xs text-red-600">{errors.city}</div> : null}
        </label>
        <label className="text-sm text-zinc-700">
          State
          <select
            value={values.state}
            onChange={(event) => onChange("state", event.target.value)}
            className={`mt-2 w-full rounded-2xl border bg-white px-3 py-2 text-sm uppercase text-zinc-900 ${
              errors?.state ? "border-red-300" : "border-zinc-200"
            }`}
          >
            <option value="">Select a state</option>
            {US_STATES.map((state) => (
              <option key={state.value} value={state.value}>
                {state.label}
              </option>
            ))}
          </select>
          {errors?.state ? <div className="mt-2 text-xs text-red-600">{errors.state}</div> : null}
        </label>
        <label className="text-sm text-zinc-700">
          ZIP code
          <input
            value={values.zipCode}
            onChange={(event) => onChange("zipCode", event.target.value)}
            className={`mt-2 w-full rounded-2xl border bg-white px-3 py-2 text-sm text-zinc-900 ${
              errors?.zipCode ? "border-red-300" : "border-zinc-200"
            }`}
          />
          {errors?.zipCode ? <div className="mt-2 text-xs text-red-600">{errors.zipCode}</div> : null}
        </label>
        <label className="text-sm text-zinc-700">
          Country
          <div className="mt-2 w-full rounded-2xl border border-zinc-200 bg-zinc-100 px-3 py-2 text-sm text-zinc-600">
            United States
          </div>
        </label>
      </div>

      {formError ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {formError}
        </div>
      ) : null}

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={onSubmit}
          disabled={saving}
          className="rounded-full bg-zinc-900 px-5 py-2 text-sm text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          {saving ? "Saving..." : submitLabel}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-zinc-300 px-5 py-2 text-sm text-zinc-700 hover:border-zinc-500 hover:text-zinc-900"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function ProfilePageClient({
  initialSection = "overview",
}: {
  initialSection?: ProfileSection;
}) {
  const { addItem, openCart } = useCart();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [ordersLoaded, setOrdersLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [measurementForm, setMeasurementForm] = useState<MeasurementForm>(emptyMeasurementForm());
  const [shippingForms, setShippingForms] = useState<AddressForm[]>([emptyAddressForm(), emptyAddressForm()]);
  const [billingForm, setBillingForm] = useState<AddressForm>(emptyAddressForm());
  const [savingMeasurement, setSavingMeasurement] = useState(false);
  const [savingShippingIndex, setSavingShippingIndex] = useState<number | null>(null);
  const [savingBilling, setSavingBilling] = useState(false);
  const [deletingAddressId, setDeletingAddressId] = useState<number | null>(null);
  const [measurementErrors, setMeasurementErrors] = useState<MeasurementFormErrors>({});
  const [measurementFormError, setMeasurementFormError] = useState<string | null>(null);
  const [shippingFormErrors, setShippingFormErrors] = useState<AddressFormErrors[]>([{}, {}]);
  const [shippingFormError, setShippingFormError] = useState<string | null>(null);
  const [billingFormErrors, setBillingFormErrors] = useState<AddressFormErrors>({});
  const [billingFormError, setBillingFormError] = useState<string | null>(null);
  const [showSecondShippingForm, setShowSecondShippingForm] = useState(false);
  const [isEditingMeasurement, setIsEditingMeasurement] = useState(false);
  const [editingShippingAddressId, setEditingShippingAddressId] = useState<number | null>(null);
  const [editingBillingAddressId, setEditingBillingAddressId] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState<ProfileSection>(initialSection);
  const [showBillingForm, setShowBillingForm] = useState(false);

  function buyOrderItemAgain(item: OrderRecord["items"][number]) {
    addItem({
      id: `${item.productId}-${item.variantId}`,
      name: item.name,
      price: item.unitPriceUsd,
      weightKg: item.weightKg,
      imageUrl: item.imageUrl,
      color: item.color,
      size: item.size,
      qty: item.quantity,
    });
    openCart();
  }

  useEffect(() => {
    setActiveSection(initialSection);
  }, [initialSection]);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/profile", { cache: "no-store" });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          if (!cancelled) {
            setError(payload?.error ?? "Unable to load profile.");
            setLoading(false);
          }
          return;
        }

        if (!cancelled) {
          setProfile(payload);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError("Unable to load profile.");
          setLoading(false);
        }
      }
    }

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (activeSection !== "orders" || ordersLoaded) {
      return;
    }

    let cancelled = false;
    const LOAD_ORDERS_TIMEOUT_MS = 10000;

    async function loadOrders() {
      setOrdersLoading(true);
      setOrdersError(null);

      try {
        const response = await Promise.race([
          fetch("/api/profile/orders", { cache: "no-store" }),
          new Promise<never>((_, reject) => {
            window.setTimeout(() => reject(new Error("Orders request timed out.")), LOAD_ORDERS_TIMEOUT_MS);
          }),
        ]);

        const payload = await response.json().catch(() => null);

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          setOrdersError(payload?.error ?? "Unable to load orders.");
          setOrdersLoaded(true);
          setOrdersLoading(false);
          return;
        }

        setOrders(Array.isArray(payload) ? payload : []);
      } catch {
        if (!cancelled) {
          setOrders([]);
          setOrdersError("Unable to load orders.");
        }
      } finally {
        if (!cancelled) {
          setOrdersLoaded(true);
          setOrdersLoading(false);
        }
      }
    }

    void loadOrders();

    return () => {
      cancelled = true;
    };
  }, [activeSection, ordersLoaded]);

  const nextShippingFormIndex =
    profile?.shippingAddresses.length === 0
      ? 0
      : profile?.shippingAddresses.length === 1 && showSecondShippingForm
        ? 1
        : null;

  async function saveMeasurementForm() {
    const validationErrors = validateMeasurementForm(measurementForm);
    if (Object.keys(validationErrors).length > 0) {
      setMeasurementErrors(validationErrors);
      setMeasurementFormError(null);
      return;
    }

    setSavingMeasurement(true);
    setError(null);
    setMeasurementErrors({});
    setMeasurementFormError(null);

    const response = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section: "measurement",
        measurement: measurementFormToCentimeters(measurementForm),
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setMeasurementFormError(payload?.error ?? "Unable to save measurement.");
      setSavingMeasurement(false);
      return;
    }

    setProfile(payload);
    setMeasurementForm(emptyMeasurementForm());
    setMeasurementErrors({});
    setMeasurementFormError(null);
    setIsEditingMeasurement(false);
    setSavingMeasurement(false);
  }

  async function saveAddressForm(
    addressType: "shipping" | "billing",
    form: AddressForm,
    index?: number,
    addressId?: number
  ) {
    const validationErrors = validateAddressForm(form);
    if (Object.keys(validationErrors).length > 0) {
      if (addressType === "shipping" && typeof index === "number") {
        setShippingFormErrors((current) => current.map((item, itemIndex) => (
          itemIndex === index ? validationErrors : item
        )));
        setShippingFormError(null);
      } else {
        setBillingFormErrors(validationErrors);
        setBillingFormError(null);
      }
      return;
    }

    if (addressType === "shipping" && typeof index === "number") {
      setSavingShippingIndex(index);
      setShippingFormErrors((current) => current.map((item, itemIndex) => (
        itemIndex === index ? {} : item
      )));
      setShippingFormError(null);
    } else {
      setSavingBilling(true);
      setBillingFormErrors({});
      setBillingFormError(null);
    }
    setError(null);

    const response = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section: "address",
        addressType,
        addressId,
        address: form,
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      if (addressType === "shipping") {
        setShippingFormError(payload?.error ?? "Unable to save address.");
      } else {
        setBillingFormError(payload?.error ?? "Unable to save address.");
      }
      setSavingShippingIndex(null);
      setSavingBilling(false);
      return;
    }

    setProfile(payload);
    if (addressType === "shipping" && typeof index === "number") {
      setShippingForms((current) => current.map((item, itemIndex) => (
        itemIndex === index ? emptyAddressForm() : item
      )));
      setShippingFormErrors((current) => current.map((item, itemIndex) => (
        itemIndex === index ? {} : item
      )));
      setShippingFormError(null);
      setShowSecondShippingForm(false);
      setEditingShippingAddressId(null);
      setSavingShippingIndex(null);
    } else {
      setBillingForm(emptyAddressForm());
      setBillingFormErrors({});
      setBillingFormError(null);
      setEditingBillingAddressId(null);
      setSavingBilling(false);
    }
  }

  async function deleteSavedAddress(addressId: number) {
    setDeletingAddressId(addressId);
    setError(null);

    const response = await fetch("/api/profile", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addressId }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.error ?? "Unable to delete address.");
      setDeletingAddressId(null);
      return;
    }

    setProfile(payload);
    setDeletingAddressId(null);
    setEditingShippingAddressId((current) => (current === addressId ? null : current));
    setEditingBillingAddressId((current) => (current === addressId ? null : current));
    setShowSecondShippingForm(false);
    setShowBillingForm(false);
  }

  async function useShippingAsBilling() {
    setSavingBilling(true);
    setBillingFormError(null);
    setError(null);

    const response = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: "billing-from-shipping" }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setBillingFormError(payload?.error ?? "Unable to use shipping address as billing.");
      setSavingBilling(false);
      return;
    }

    setProfile(payload);
    setShowBillingForm(false);
    setSavingBilling(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-50 px-4 py-10 text-zinc-900 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
            Loading profile...
          </div>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-zinc-50 px-4 py-10 text-zinc-900 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700 sm:p-8">
            {error ?? "Unable to load profile."}
          </div>
        </div>
      </main>
    );
  }

  const navigationItems: Array<{ id: ProfileSection; label: string; detail: string }> = [
    { id: "overview", label: "Profile", detail: "Name and account email" },
    { id: "orders", label: "Orders", detail: "Past purchases and invoices" },
    { id: "measurements", label: "Measurements", detail: "Body sizing and fit data" },
    { id: "shipping", label: "Shipping Addresses", detail: "Up to two delivery addresses" },
    { id: "billing", label: "Billing Addresses", detail: "Payment and invoice addresses" },
  ];

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-10 text-zinc-900 sm:px-6 sm:py-16">
      <div className="mx-auto grid max-w-6xl gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="rounded-[2rem] border border-zinc-200 bg-white p-4 shadow-sm">
            <nav className="space-y-2">
              {navigationItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full rounded-2xl px-4 py-4 text-left transition ${
                    activeSection === item.id
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
                  }`}
                >
                  <div className="text-sm font-semibold">{item.label}</div>
                  <div
                    className={`mt-1 text-xs ${
                      activeSection === item.id ? "text-zinc-300" : "text-zinc-500"
                    }`}
                  >
                    {item.detail}
                  </div>
                </button>
              ))}
            </nav>
          </aside>

          {activeSection === "overview" ? (
            <section className="rounded-[2rem] border border-zinc-200 bg-white px-5 py-5 shadow-sm sm:px-8 sm:py-6">
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Profile</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">{formatName(profile.user)}</h1>
              <p className="mt-1 text-sm text-zinc-600">{profile.user.email}</p>
            </section>
          ) : null}

          {activeSection === "orders" ? (
            <section className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm sm:p-8">
              <h2 className="text-2xl font-semibold tracking-tight">Orders</h2>
              <p className="mt-2 text-sm text-zinc-600">
                Review the orders and invoice numbers saved to your account.
              </p>

              {ordersLoading ? (
                <div className="mt-6 rounded-3xl border border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-600">
                  Loading orders...
                </div>
              ) : ordersError ? (
                <div className="mt-6 rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
                  {ordersError}
                </div>
              ) : orders.length === 0 ? (
                <div className="mt-6 rounded-3xl border border-dashed border-zinc-300 bg-zinc-50 p-5 text-sm text-zinc-600">
                  No orders yet.
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="text-sm text-zinc-500">
                            {order.invoiceNumber ?? `Order #${order.id}`}
                          </div>
                          <div className="mt-2 text-base font-semibold text-zinc-900">
                            {formatDateTime(order.paidAt ?? order.createdAt)}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-zinc-200 px-3 py-1 text-xs font-medium text-zinc-700">
                            Payment: {order.paymentStatus}
                          </span>
                          <span className="rounded-full bg-zinc-200 px-3 py-1 text-xs font-medium text-zinc-700">
                            Shipment: {order.shipmentStatus}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 text-sm text-zinc-600 sm:grid-cols-3">
                        <div>
                          <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Subtotal</div>
                          <div className="mt-1 font-medium text-zinc-900">{formatMoney(order.subtotalUsd)}</div>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Shipping</div>
                          <div className="mt-1 font-medium text-zinc-900">{formatMoney(order.shippingUsd)}</div>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Total</div>
                          <div className="mt-1 font-semibold text-zinc-900">{formatMoney(order.totalUsd)}</div>
                        </div>
                      </div>

                      {order.items.length > 0 ? (
                        <div className="mt-5 border-t border-zinc-200 pt-4">
                          <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Items</div>
                          <div className="mt-3 space-y-3">
                            {order.items.map((item) => (
                              <div
                                key={`${order.id}-${item.variantId}`}
                                className="flex items-start gap-3 rounded-2xl border border-zinc-200 bg-white p-3"
                              >
                                {item.imageUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={item.imageUrl}
                                    alt={item.name}
                                    className="h-16 w-16 rounded-2xl object-cover"
                                  />
                                ) : (
                                  <div className="h-16 w-16 rounded-2xl bg-zinc-100" />
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-semibold text-zinc-900">{item.name}</div>
                                  <div className="mt-1 text-sm text-zinc-600">
                                    Qty {item.quantity}
                                    {item.color ? ` · ${item.color}` : ""}
                                    {item.size ? ` · ${item.size}` : ""}
                                  </div>
                                  <div className="mt-1 text-sm text-zinc-500">
                                    Unit {formatMoney(item.unitPriceUsd)}
                                  </div>
                                </div>
                                {item.variantExists ? (
                                  <button
                                    type="button"
                                    onClick={() => buyOrderItemAgain(item)}
                                    className="shrink-0 rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                                  >
                                    Buy again
                                  </button>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </section>
          ) : null}

          {activeSection === "measurements" ? (
            <section className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">Measurements</h2>
                  <p className="mt-2 text-sm text-zinc-600">
                    Save the measurements you use most often so size comparisons stay consistent.
                  </p>
                </div>
                {profile.measurement ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (!profile.measurement) {
                        return;
                      }

                      setMeasurementForm(measurementToForm(profile.measurement));
                      setIsEditingMeasurement(true);
                    }}
                    className="rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:border-zinc-500 hover:text-zinc-900"
                  >
                    Edit
                  </button>
                ) : null}
              </div>

              {profile.measurement && !isEditingMeasurement ? (
                <div className="mt-6 space-y-6">
                  <section>
                    <h3 className="text-sm font-semibold text-zinc-900">Upper body</h3>
                    <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Height</p>
                        <p className="mt-3 text-2xl font-semibold">{formatHeightUs(profile.measurement.heightCm)}</p>
                        <p className="mt-1 text-xs text-zinc-500">{formatCm(profile.measurement.heightCm)}</p>
                      </div>
                      <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Chest</p>
                        <p className="mt-3 text-2xl font-semibold">{formatInches(profile.measurement.chestCm)}</p>
                        <p className="mt-1 text-xs text-zinc-500">{formatCm(profile.measurement.chestCm)}</p>
                      </div>
                      <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Shoulder Width</p>
                        <p className="mt-1 text-xs text-zinc-500">From shoulder seam to shoulder seam</p>
                        <p className="mt-3 text-2xl font-semibold">
                          {formatInches(profile.measurement.shoulderWidthCm)}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">{formatCm(profile.measurement.shoulderWidthCm)}</p>
                      </div>
                      <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Arm Length</p>
                        <p className="mt-1 text-xs text-zinc-500">From shoulder seam to wrist</p>
                        <p className="mt-3 text-2xl font-semibold">
                          {formatInches(profile.measurement.sleeveLengthCm)}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">{formatCm(profile.measurement.sleeveLengthCm)}</p>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-sm font-semibold text-zinc-900">Pants</h3>
                    <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Waist</p>
                        <p className="mt-3 text-2xl font-semibold">{formatInches(profile.measurement.waistCm)}</p>
                        <p className="mt-1 text-xs text-zinc-500">{formatCm(profile.measurement.waistCm)}</p>
                      </div>
                      <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Hip</p>
                        <p className="mt-3 text-2xl font-semibold">{formatInches(profile.measurement.hipCm)}</p>
                        <p className="mt-1 text-xs text-zinc-500">{formatCm(profile.measurement.hipCm)}</p>
                      </div>
                      <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Inseam</p>
                        <p className="mt-1 text-xs text-zinc-500">From crotch seam to ankle hem</p>
                        <p className="mt-3 text-2xl font-semibold">{formatInches(profile.measurement.inseamCm)}</p>
                        <p className="mt-1 text-xs text-zinc-500">{formatCm(profile.measurement.inseamCm)}</p>
                      </div>
                    </div>
                  </section>
                </div>
              ) : (
                <div className="mt-6 rounded-3xl border border-dashed border-zinc-300 bg-zinc-50 p-6">
                  <div className="space-y-8">
                    <section>
                      <h3 className="text-sm font-semibold text-zinc-900">Upper body</h3>
                      <div className="mt-4 grid gap-5 md:grid-cols-2">
                    <label className="flex flex-col text-sm text-zinc-700">
                      <span className="flex min-h-16 items-start">Height</span>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <input
                          value={measurementForm.heightFeet}
                          onChange={(event) => setMeasurementForm((current) => ({
                            ...current,
                            heightFeet: event.target.value,
                          }))}
                          placeholder="ft"
                          inputMode="decimal"
                          className={`w-full rounded-2xl border bg-white px-3 py-2 text-sm text-zinc-900 ${
                            measurementErrors.heightFeet ? "border-red-300" : "border-zinc-200"
                          }`}
                        />
                        <input
                          value={measurementForm.heightInches}
                          onChange={(event) => setMeasurementForm((current) => ({
                            ...current,
                            heightInches: event.target.value,
                          }))}
                          placeholder="in"
                          inputMode="decimal"
                          className={`w-full rounded-2xl border bg-white px-3 py-2 text-sm text-zinc-900 ${
                            measurementErrors.heightInches ? "border-red-300" : "border-zinc-200"
                          }`}
                        />
                      </div>
                      {measurementErrors.heightFeet || measurementErrors.heightInches ? (
                        <div className="mt-2 text-xs text-red-600">
                          {measurementErrors.heightFeet ?? measurementErrors.heightInches}
                        </div>
                      ) : null}
                    </label>
                    <label className="flex flex-col text-sm text-zinc-700">
                      <span className="flex min-h-16 items-start">Chest (in)</span>
                      <input
                        value={measurementForm.chestInches}
                        onChange={(event) => setMeasurementForm((current) => ({
                          ...current,
                          chestInches: event.target.value,
                        }))}
                        inputMode="decimal"
                        className={`mt-2 w-full rounded-2xl border bg-white px-3 py-2 text-sm text-zinc-900 ${
                          measurementErrors.chestInches ? "border-red-300" : "border-zinc-200"
                        }`}
                      />
                      {measurementErrors.chestInches ? (
                        <div className="mt-2 text-xs text-red-600">{measurementErrors.chestInches}</div>
                      ) : null}
                    </label>
                    <label className="flex flex-col text-sm text-zinc-700">
                      <span className="flex min-h-16 flex-col items-start">
                        <span>Shoulder width (in)</span>
                        <span className="mt-1 text-xs text-zinc-500">From shoulder seam to shoulder seam</span>
                      </span>
                      <input
                        value={measurementForm.shoulderWidthInches}
                        onChange={(event) => setMeasurementForm((current) => ({
                          ...current,
                          shoulderWidthInches: event.target.value,
                        }))}
                        inputMode="decimal"
                        className={`mt-2 w-full rounded-2xl border bg-white px-3 py-2 text-sm text-zinc-900 ${
                          measurementErrors.shoulderWidthInches ? "border-red-300" : "border-zinc-200"
                        }`}
                      />
                      {measurementErrors.shoulderWidthInches ? (
                        <div className="mt-2 text-xs text-red-600">{measurementErrors.shoulderWidthInches}</div>
                      ) : null}
                    </label>
                    <label className="flex flex-col text-sm text-zinc-700">
                      <span className="flex min-h-16 flex-col items-start">
                        <span>Arm length (in)</span>
                        <span className="mt-1 text-xs text-zinc-500">From shoulder seam to wrist</span>
                      </span>
                      <input
                        value={measurementForm.sleeveLengthInches}
                        onChange={(event) => setMeasurementForm((current) => ({
                          ...current,
                          sleeveLengthInches: event.target.value,
                        }))}
                        inputMode="decimal"
                        className={`mt-2 w-full rounded-2xl border bg-white px-3 py-2 text-sm text-zinc-900 ${
                          measurementErrors.sleeveLengthInches ? "border-red-300" : "border-zinc-200"
                        }`}
                      />
                      {measurementErrors.sleeveLengthInches ? (
                        <div className="mt-2 text-xs text-red-600">{measurementErrors.sleeveLengthInches}</div>
                      ) : null}
                    </label>
                      </div>
                    </section>

                    <section>
                      <h3 className="text-sm font-semibold text-zinc-900">Pants</h3>
                      <div className="mt-4 grid gap-5 md:grid-cols-3">
                    <label className="flex flex-col text-sm text-zinc-700">
                      <span className="flex min-h-16 items-start">Waist (in)</span>
                      <input
                        value={measurementForm.waistInches}
                        onChange={(event) => setMeasurementForm((current) => ({
                          ...current,
                          waistInches: event.target.value,
                        }))}
                        inputMode="decimal"
                        className={`mt-2 w-full rounded-2xl border bg-white px-3 py-2 text-sm text-zinc-900 ${
                          measurementErrors.waistInches ? "border-red-300" : "border-zinc-200"
                        }`}
                      />
                      {measurementErrors.waistInches ? (
                        <div className="mt-2 text-xs text-red-600">{measurementErrors.waistInches}</div>
                      ) : null}
                    </label>
                    <label className="flex flex-col text-sm text-zinc-700">
                      <span className="flex min-h-16 items-start">Hip (in)</span>
                      <input
                        value={measurementForm.hipInches}
                        onChange={(event) => setMeasurementForm((current) => ({
                          ...current,
                          hipInches: event.target.value,
                        }))}
                        inputMode="decimal"
                        className={`mt-2 w-full rounded-2xl border bg-white px-3 py-2 text-sm text-zinc-900 ${
                          measurementErrors.hipInches ? "border-red-300" : "border-zinc-200"
                        }`}
                      />
                      {measurementErrors.hipInches ? (
                        <div className="mt-2 text-xs text-red-600">{measurementErrors.hipInches}</div>
                      ) : null}
                    </label>
                    <label className="flex flex-col text-sm text-zinc-700">
                      <span className="flex min-h-16 flex-col items-start">
                        <span>Inseam (in)</span>
                        <span className="mt-1 text-xs text-zinc-500">From crotch seam to ankle hem</span>
                      </span>
                      <input
                        value={measurementForm.inseamInches}
                        onChange={(event) => setMeasurementForm((current) => ({
                          ...current,
                          inseamInches: event.target.value,
                        }))}
                        inputMode="decimal"
                        className={`mt-2 w-full rounded-2xl border bg-white px-3 py-2 text-sm text-zinc-900 ${
                          measurementErrors.inseamInches ? "border-red-300" : "border-zinc-200"
                        }`}
                      />
                      {measurementErrors.inseamInches ? (
                        <div className="mt-2 text-xs text-red-600">{measurementErrors.inseamInches}</div>
                      ) : null}
                    </label>
                      </div>
                    </section>
                  </div>

                  {measurementFormError ? (
                    <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {measurementFormError}
                    </div>
                  ) : null}

                  <div className="mt-5 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={saveMeasurementForm}
                      disabled={savingMeasurement}
                      className="rounded-full bg-zinc-900 px-5 py-2 text-sm text-white hover:bg-zinc-800 disabled:opacity-60"
                    >
                      {savingMeasurement ? "Saving..." : profile.measurement ? "Save changes" : "Save measurements"}
                    </button>
                    {profile.measurement ? (
                      <button
                        type="button"
                        onClick={() => {
                          setMeasurementForm(emptyMeasurementForm());
                          setIsEditingMeasurement(false);
                        }}
                        className="rounded-full border border-zinc-300 px-5 py-2 text-sm text-zinc-700 hover:border-zinc-500 hover:text-zinc-900"
                      >
                        Cancel
                      </button>
                    ) : null}
                  </div>
                </div>
              )}
            </section>
          ) : null}

          {activeSection === "shipping" ? (
            <section className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm sm:p-8">
              <h2 className="text-2xl font-semibold tracking-tight">Shipping Addresses</h2>
              <p className="mt-2 text-sm text-zinc-600">
                Keep up to two shipping addresses on file for faster checkout later.
              </p>

              <div className="mt-6 grid gap-4">
                {profile.shippingAddresses.map((address) => (
                  editingShippingAddressId === address.id ? (
                    <AddressFormFields
                      key={address.id}
                      values={shippingForms[0]}
                      onChange={(field, value) => {
                        setShippingForms((current) => current.map((form, formIndex) => (
                          formIndex === 0 ? { ...form, [field]: value } : form
                        )));
                        setShippingFormErrors((current) => current.map((item, itemIndex) => (
                          itemIndex === 0 ? { ...item, [field]: undefined } : item
                        )));
                        setShippingFormError(null);
                      }}
                      errors={shippingFormErrors[0]}
                      formError={shippingFormError}
                      submitLabel="Save changes"
                      onSubmit={() => saveAddressForm("shipping", shippingForms[0], 0, address.id)}
                      saving={savingShippingIndex === 0}
                      onCancel={() => {
                        setShippingForms((current) => current.map((form, formIndex) => (
                          formIndex === 0 ? emptyAddressForm() : form
                        )));
                        setEditingShippingAddressId(null);
                      }}
                    />
                  ) : (
                    <AddressCard
                      key={address.id}
                      address={address}
                      onEdit={() => {
                        setShippingForms((current) => current.map((form, formIndex) => (
                          formIndex === 0 ? addressToForm(address) : form
                        )));
                        setEditingShippingAddressId(address.id);
                        setShowSecondShippingForm(false);
                      }}
                      onDelete={() => deleteSavedAddress(address.id)}
                      deleting={deletingAddressId === address.id}
                    />
                  )
                ))}

                {profile.shippingAddresses.length === 1 && !showSecondShippingForm ? (
                  <button
                    type="button"
                    onClick={() => setShowSecondShippingForm(true)}
                    className="w-fit rounded-full border border-zinc-300 px-5 py-2 text-sm text-zinc-900 hover:border-zinc-500"
                  >
                    Add second shipping address
                  </button>
                ) : null}

                {nextShippingFormIndex !== null ? (
                  <AddressFormFields
                    key={`shipping-form-${nextShippingFormIndex}`}
                    values={shippingForms[nextShippingFormIndex]}
                    onChange={(field, value) => {
                      setShippingForms((current) => current.map((form, formIndex) => (
                        formIndex === nextShippingFormIndex ? { ...form, [field]: value } : form
                      )));
                      setShippingFormErrors((current) => current.map((item, itemIndex) => (
                        itemIndex === nextShippingFormIndex ? { ...item, [field]: undefined } : item
                      )));
                      setShippingFormError(null);
                    }}
                    errors={shippingFormErrors[nextShippingFormIndex]}
                    formError={shippingFormError}
                    submitLabel={
                      nextShippingFormIndex === 0 ? "Save shipping address" : "Save second shipping address"
                    }
                    onSubmit={() => saveAddressForm("shipping", shippingForms[nextShippingFormIndex], nextShippingFormIndex)}
                    saving={savingShippingIndex === nextShippingFormIndex}
                    onCancel={nextShippingFormIndex === 1 ? () => setShowSecondShippingForm(false) : undefined}
                  />
                ) : null}
              </div>
            </section>
          ) : null}

          {activeSection === "billing" ? (
            <section className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm sm:p-8">
              <h2 className="text-2xl font-semibold tracking-tight">Billing Addresses</h2>
              <p className="mt-2 text-sm text-zinc-600">
                Save a billing address if you want your order records to keep a separate payment address.
              </p>

              <div className="mt-6 grid gap-4">
                {profile.billingAddresses.map((address) => (
                  editingBillingAddressId === address.id ? (
                    <AddressFormFields
                      key={address.id}
                    values={billingForm}
                    onChange={(field, value) => {
                      setBillingForm((current) => ({ ...current, [field]: value }));
                      setBillingFormErrors((current) => ({ ...current, [field]: undefined }));
                      setBillingFormError(null);
                    }}
                    errors={billingFormErrors}
                    formError={billingFormError}
                    submitLabel="Save changes"
                      onSubmit={() => saveAddressForm("billing", billingForm, undefined, address.id)}
                      saving={savingBilling}
                      onCancel={() => {
                        setBillingForm(emptyAddressForm());
                        setEditingBillingAddressId(null);
                      }}
                    />
                  ) : (
                    <AddressCard
                      key={address.id}
                      address={address}
                      onEdit={() => {
                        setBillingForm(addressToForm(address));
                        setEditingBillingAddressId(address.id);
                      }}
                      onDelete={() => deleteSavedAddress(address.id)}
                      deleting={deletingAddressId === address.id}
                    />
                  )
                ))}

                {profile.billingAddresses.length === 0 ? (
                  showBillingForm ? (
                    <AddressFormFields
                      values={billingForm}
                      onChange={(field, value) => {
                        setBillingForm((current) => ({ ...current, [field]: value }));
                        setBillingFormErrors((current) => ({ ...current, [field]: undefined }));
                        setBillingFormError(null);
                      }}
                      errors={billingFormErrors}
                      formError={billingFormError}
                      submitLabel="Save billing address"
                      onSubmit={() => saveAddressForm("billing", billingForm)}
                      saving={savingBilling}
                      onCancel={() => {
                        setBillingForm(emptyAddressForm());
                        setBillingFormErrors({});
                        setBillingFormError(null);
                        setShowBillingForm(false);
                      }}
                    />
                  ) : (
                    <div className="rounded-3xl border border-dashed border-zinc-300 bg-zinc-50 p-6">
                      <h3 className="text-lg font-semibold text-zinc-900">Is your billing address the same as shipping?</h3>
                      <p className="mt-2 text-sm text-zinc-600">
                        You can reuse your default shipping address or add a separate billing address.
                      </p>
                      {billingFormError ? (
                        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                          {billingFormError}
                        </div>
                      ) : null}
                      <div className="mt-5 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={useShippingAsBilling}
                          disabled={savingBilling}
                          className="rounded-full bg-zinc-900 px-5 py-2 text-sm text-white hover:bg-zinc-800 disabled:opacity-60"
                        >
                          {savingBilling ? "Saving..." : "Yes, use shipping address"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setBillingFormError(null);
                            setShowBillingForm(true);
                          }}
                          className="rounded-full border border-zinc-300 px-5 py-2 text-sm text-zinc-700 hover:border-zinc-500 hover:text-zinc-900"
                        >
                          No, add a separate billing address
                        </button>
                      </div>
                    </div>
                  )
                ) : null}
              </div>
            </section>
          ) : null}
      </div>
    </main>
  );
}
