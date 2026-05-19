"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import ItemsPanel from "@/components/cart/ItemsPanel";
import OrderSummary from "@/components/cart/OrderSummary";
import { useCart } from "@/components/cart/CartContext";
import { useShippingOptions } from "@/components/cart/useShippingOptions";
import { formatUsd } from "@/lib/formatters";
import { getBoxWeightKg } from "@/lib/shipping";
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

type ProfileAddress = {
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

type ProfilePayload = {
  shippingAddresses: ProfileAddress[];
  billingAddresses: ProfileAddress[];
};

type CartSelectionsPayload = {
  shippingAddressId: number | null;
  billingAddressId: number | null;
  shippingId: number | null;
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

type AddressFormErrors = Partial<Record<keyof AddressForm, string>>;

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

function addressToForm(address: ProfileAddress): AddressForm {
  return {
    name: address.name,
    street: address.street,
    city: address.city,
    state: address.state,
    zipCode: address.zipCode,
    country: "United States",
    phone: address.phone,
  };
}

function formatUsPhone(phone: string) {
  const trimmedPhone = phone.trim();
  if (!trimmedPhone) return "";
  return trimmedPhone.startsWith("+1") ? trimmedPhone : `+1 ${trimmedPhone}`;
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

function AddressChoiceCard({
  address,
  selected,
  onSelect,
  onEdit,
  onDelete,
  deleting = false,
}: {
  address: ProfileAddress;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete?: () => void;
  deleting?: boolean;
}) {
  return (
    <label
      className={`block cursor-pointer rounded-3xl border p-4 shadow-sm sm:p-5 ${
        selected ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 bg-white"
      }`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <input
            type="radio"
            checked={selected}
            onChange={onSelect}
            className="mt-1"
            name={`checkout-address-${address.addressType}`}
          />
          <div className="min-w-0">
            <div className="text-base font-semibold text-zinc-900">{address.name}</div>
            <div className="mt-2 text-sm leading-6 text-zinc-600">
              {address.street}
              <br />
              {address.city}, {address.state} {address.zipCode}
              <br />
              {address.country}
              <br />
              {formatUsPhone(address.phone)}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              onEdit();
            }}
            className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:border-zinc-500 hover:text-zinc-900"
          >
            Edit
          </button>
          {onDelete ? (
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                onDelete();
              }}
              disabled={deleting}
              className="rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-700 hover:border-red-400 hover:text-red-900 disabled:opacity-60"
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
    </label>
  );
}

function CompactAddressOption({
  address,
  selected,
  onSelect,
  onDelete,
  deleting = false,
}: {
  address: ProfileAddress;
  selected: boolean;
  onSelect: () => void;
  onDelete?: () => void;
  deleting?: boolean;
}) {
  return (
    <label
      className={`block cursor-pointer rounded-2xl border px-4 py-3 ${
        selected ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 bg-white"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
        <input
          type="radio"
          checked={selected}
          onChange={onSelect}
          className="mt-1"
          name={`checkout-address-${address.addressType}`}
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-zinc-900">{address.name}</span>
            {address.isDefault ? (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-700">
                Default
              </span>
            ) : null}
          </div>
          <div className="mt-1 text-xs text-zinc-500">
            {address.city}, {address.state} {address.zipCode}
          </div>
        </div>
        </div>
        {onDelete ? (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              onDelete();
            }}
            disabled={deleting}
            className="self-start rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-700 hover:border-red-400 hover:text-red-900 disabled:opacity-60 sm:self-auto"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        ) : null}
      </div>
    </label>
  );
}

function AddressEditor({
  values,
  onChange,
  errors,
  formError,
  onSubmit,
  onCancel,
  saving,
  submitLabel = "Save changes",
}: {
  values: AddressForm;
  onChange: (field: keyof AddressForm, value: string) => void;
  errors: AddressFormErrors;
  formError: string | null;
  onSubmit: () => void;
  onCancel: () => void;
  saving: boolean;
  submitLabel?: string;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-zinc-300 bg-zinc-50 p-4 sm:p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm text-zinc-700">
          Full name
          <input
            value={values.name}
            onChange={(event) => onChange("name", event.target.value)}
            className={`mt-2 w-full rounded-2xl border bg-white px-3 py-2 text-sm text-zinc-900 ${
              errors.name ? "border-red-300" : "border-zinc-200"
            }`}
          />
          {errors.name ? <div className="mt-2 text-xs text-red-600">{errors.name}</div> : null}
        </label>
        <label className="text-sm text-zinc-700">
          Phone
          <div
            className={`mt-2 flex items-center overflow-hidden rounded-2xl border bg-white ${
              errors.phone ? "border-red-300" : "border-zinc-200"
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
          {errors.phone ? <div className="mt-2 text-xs text-red-600">{errors.phone}</div> : null}
        </label>
        <label className="text-sm text-zinc-700 md:col-span-2">
          Street
          <input
            value={values.street}
            onChange={(event) => onChange("street", event.target.value)}
            className={`mt-2 w-full rounded-2xl border bg-white px-3 py-2 text-sm text-zinc-900 ${
              errors.street ? "border-red-300" : "border-zinc-200"
            }`}
          />
          {errors.street ? <div className="mt-2 text-xs text-red-600">{errors.street}</div> : null}
        </label>
        <label className="text-sm text-zinc-700">
          City
          <input
            value={values.city}
            onChange={(event) => onChange("city", event.target.value)}
            className={`mt-2 w-full rounded-2xl border bg-white px-3 py-2 text-sm text-zinc-900 ${
              errors.city ? "border-red-300" : "border-zinc-200"
            }`}
          />
          {errors.city ? <div className="mt-2 text-xs text-red-600">{errors.city}</div> : null}
        </label>
        <label className="text-sm text-zinc-700">
          State
          <select
            value={values.state}
            onChange={(event) => onChange("state", event.target.value)}
            className={`mt-2 w-full rounded-2xl border bg-white px-3 py-2 text-sm text-zinc-900 ${
              errors.state ? "border-red-300" : "border-zinc-200"
            }`}
          >
            <option value="">Select a state</option>
            {US_STATES.map((state) => (
              <option key={state.value} value={state.value}>
                {state.label}
              </option>
            ))}
          </select>
          {errors.state ? <div className="mt-2 text-xs text-red-600">{errors.state}</div> : null}
        </label>
        <label className="text-sm text-zinc-700">
          ZIP code
          <input
            value={values.zipCode}
            onChange={(event) => onChange("zipCode", event.target.value)}
            className={`mt-2 w-full rounded-2xl border bg-white px-3 py-2 text-sm text-zinc-900 ${
              errors.zipCode ? "border-red-300" : "border-zinc-200"
            }`}
          />
          {errors.zipCode ? <div className="mt-2 text-xs text-red-600">{errors.zipCode}</div> : null}
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

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onSubmit}
          disabled={saving}
          className="rounded-full bg-zinc-900 px-5 py-2 text-sm text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          {saving ? "Saving..." : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-zinc-300 px-5 py-2 text-sm text-zinc-700 hover:border-zinc-500 hover:text-zinc-900"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function CartPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const opensCheckoutFromUrl = searchParams.get("checkout") === "1";
  const {
    items,
    subtotal,
    totalWeightKg,
    selectedShippingModeId,
    setSelectedShippingModeId,
    removeItem,
    updateQty,
    clearCart,
  } = useCart();
  const [showCheckoutReview, setShowCheckoutReview] = useState(opensCheckoutFromUrl);
  const [profileData, setProfileData] = useState<ProfilePayload | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [selectedShippingAddressId, setSelectedShippingAddressId] = useState<number | null>(null);
  const [selectedBillingAddressId, setSelectedBillingAddressId] = useState<number | null>(null);
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(false);
  const [checkoutSelectionsHydrated, setCheckoutSelectionsHydrated] = useState(false);
  const [editingShippingAddressId, setEditingShippingAddressId] = useState<number | null>(null);
  const [editingBillingAddressId, setEditingBillingAddressId] = useState<number | null>(null);
  const [shippingAddressForm, setShippingAddressForm] = useState<AddressForm>(emptyAddressForm());
  const [billingAddressForm, setBillingAddressForm] = useState<AddressForm>(emptyAddressForm());
  const [shippingAddressErrors, setShippingAddressErrors] = useState<AddressFormErrors>({});
  const [billingAddressErrors, setBillingAddressErrors] = useState<AddressFormErrors>({});
  const [shippingAddressFormError, setShippingAddressFormError] = useState<string | null>(null);
  const [billingAddressFormError, setBillingAddressFormError] = useState<string | null>(null);
  const [savingShippingAddress, setSavingShippingAddress] = useState(false);
  const [savingBillingAddress, setSavingBillingAddress] = useState(false);
  const [deletingAddressId, setDeletingAddressId] = useState<number | null>(null);
  const [showNewShippingAddressForm, setShowNewShippingAddressForm] = useState(false);
  const [showNewBillingAddressForm, setShowNewBillingAddressForm] = useState(false);
  const [highlightCheckoutReview, setHighlightCheckoutReview] = useState(opensCheckoutFromUrl);
  const [stripeCheckoutLoading, setStripeCheckoutLoading] = useState(false);
  const [stripeCheckoutError, setStripeCheckoutError] = useState<string | null>(null);
  const checkoutReviewRef = useRef<HTMLElement | null>(null);
  const boxWeightKg = useMemo(() => getBoxWeightKg(totalWeightKg), [totalWeightKg]);
  const shipmentWeightKg = useMemo(() => totalWeightKg + boxWeightKg, [boxWeightKg, totalWeightKg]);
  const {
    shippingError,
    shippingLoading,
    shippingOptions,
    selectedShippingOption,
  } = useShippingOptions(shipmentWeightKg, selectedShippingModeId, setSelectedShippingModeId);

  const shippingAddresses = profileData?.shippingAddresses ?? [];
  const billingAddresses = profileData?.billingAddresses ?? [];

  const selectedShippingAddress = useMemo(() => {
    return profileData?.shippingAddresses.find((address) => address.id === selectedShippingAddressId) ?? null;
  }, [profileData, selectedShippingAddressId]);
  const selectedBillingAddress = useMemo(() => {
    return profileData?.billingAddresses.find((address) => address.id === selectedBillingAddressId) ?? null;
  }, [profileData, selectedBillingAddressId]);
  const alternativeShippingAddresses = shippingAddresses.filter((address) => address.id !== selectedShippingAddressId);
  const alternativeBillingAddresses = billingAddresses.filter((address) => address.id !== selectedBillingAddressId);
  const checkoutOrderTotal = subtotal + (selectedShippingOption?.shippingCostUsd ?? 0);
  const effectiveBillingAddress = billingSameAsShipping ? selectedShippingAddress : selectedBillingAddress;
  const canStartStripeCheckout = Boolean(
    selectedShippingAddress &&
      effectiveBillingAddress &&
      selectedShippingOption &&
      items.length > 0
  );
  
  async function handleStripeCheckout() {
    if (!canStartStripeCheckout || !selectedShippingAddress || !effectiveBillingAddress || !selectedShippingOption) {
      setStripeCheckoutError("Select shipping and billing details before completing payment.");
      return;
    }

    setStripeCheckoutLoading(true);
    setStripeCheckoutError(null);

    try {
      const response = await fetch("/api/orders/checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subtotalUsd: subtotal,
          shippingUsd: selectedShippingOption.shippingCostUsd ?? 0,
          totalUsd: checkoutOrderTotal,
          clothesWeightKg: totalWeightKg,
          boxWeightKg,
          shippingWeightKg: shipmentWeightKg,
          shippingId: selectedShippingOption.id,
          shippingAddressId: selectedShippingAddressId,
          billingAddressId: effectiveBillingAddress?.id,
          items: items.map((item) => ({
            cartItemId: item.id,
            quantity: item.qty,
            unitPriceUsd: item.price,
            name: item.name,
            color: item.color,
            size: item.size,
          })),
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setStripeCheckoutError(payload?.error ?? "Unable to start checkout.");
        return;
      }

      if (typeof payload?.url !== "string" || !payload.url.trim()) {
        setStripeCheckoutError("Stripe did not return a checkout URL.");
        return;
      }

      window.location.assign(payload.url);
    } finally {
      setStripeCheckoutLoading(false);
    }
  }

  const loadCheckoutProfile = useCallback(async () => {
    setProfileLoading(true);
    setProfileError(null);

    const [profileResponse, cartResponse] = await Promise.all([
      fetch("/api/profile", { cache: "no-store" }),
      fetch("/api/cart", { cache: "no-store" }),
    ]);
    const profilePayload = await profileResponse.json().catch(() => null);
    const cartPayload = await cartResponse.json().catch(() => null);

    if (!profileResponse.ok) {
      setProfileError(profilePayload?.error ?? "Unable to load checkout details.");
      setProfileLoading(false);
      setCheckoutSelectionsHydrated(false);
      return;
    }

    if (!cartResponse.ok) {
      setProfileError(cartPayload?.error ?? "Unable to load cart defaults.");
      setProfileLoading(false);
      setCheckoutSelectionsHydrated(false);
      return;
    }

    const nextProfile = profilePayload as ProfilePayload;
    const persistedCart = cartPayload as CartSelectionsPayload;
    const defaultShippingId =
      nextProfile.shippingAddresses.find((address) => address.isDefault)?.id ??
      nextProfile.shippingAddresses[0]?.id ??
      null;
    const nextShippingId =
      nextProfile.shippingAddresses.find((address) => address.id === persistedCart.shippingAddressId)?.id ??
      defaultShippingId;
    const sameAsShipping =
      nextShippingId != null &&
      persistedCart.billingAddressId != null &&
      persistedCart.billingAddressId === nextShippingId;
    const defaultBillingId =
      nextProfile.billingAddresses.find((address) => address.isDefault)?.id ??
      nextProfile.billingAddresses[0]?.id ??
      null;
    const nextBillingId = sameAsShipping
      ? nextShippingId
      : nextProfile.billingAddresses.find((address) => address.id === persistedCart.billingAddressId)?.id ??
        defaultBillingId;

    setProfileData(nextProfile);
    setSelectedShippingAddressId(nextShippingId);
    setSelectedBillingAddressId(nextBillingId);
    setBillingSameAsShipping(nextProfile.billingAddresses.length === 0 || sameAsShipping);
    setSelectedShippingModeId(persistedCart.shippingId);
    setCheckoutSelectionsHydrated(true);
    setProfileLoading(false);
  }, [setSelectedShippingModeId]);

  async function handleCheckoutClick() {
    const nextOpen = !showCheckoutReview;
    setShowCheckoutReview(nextOpen);
    setHighlightCheckoutReview(nextOpen);
    if (nextOpen && profileData === null && !profileLoading) {
      await loadCheckoutProfile();
    }
  }

  useEffect(() => {
    if (!showCheckoutReview || profileData !== null || profileLoading) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      void loadCheckoutProfile();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadCheckoutProfile, profileData, profileLoading, showCheckoutReview]);

  useEffect(() => {
    if (!checkoutSelectionsHydrated || shippingOptions.length === 0) {
      return;
    }

    if (
      selectedShippingModeId == null ||
      !shippingOptions.some((option) => option.id === selectedShippingModeId)
    ) {
      setSelectedShippingModeId(shippingOptions[0]?.id ?? null);
    }
  }, [checkoutSelectionsHydrated, selectedShippingModeId, setSelectedShippingModeId, shippingOptions]);

  useEffect(() => {
    if (!showCheckoutReview || !profileData || !checkoutSelectionsHydrated) {
      return;
    }

    const controller = new AbortController();

    void fetch("/api/cart", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map((item) => ({ id: item.id, qty: item.qty })),
        shippingAddressId: selectedShippingAddressId,
        billingAddressId: billingSameAsShipping ? selectedShippingAddressId : selectedBillingAddressId,
        shippingId: selectedShippingModeId,
      }),
      signal: controller.signal,
    }).catch(() => {});

    return () => controller.abort();
  }, [
    billingSameAsShipping,
    checkoutSelectionsHydrated,
    items,
    profileData,
    selectedBillingAddressId,
    selectedShippingAddressId,
    selectedShippingModeId,
    showCheckoutReview,
  ]);

  useEffect(() => {
    if (!showCheckoutReview) {
      return;
    }

    checkoutReviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [showCheckoutReview]);

  useEffect(() => {
    if (!highlightCheckoutReview) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setHighlightCheckoutReview(false);
    }, 1800);

    return () => window.clearTimeout(timeoutId);
  }, [highlightCheckoutReview]);

  async function saveAddressEdit(
    addressType: "shipping" | "billing",
    addressId: number | null,
    form: AddressForm
  ) {
    const existingIds =
      addressType === "shipping"
        ? new Set(shippingAddresses.map((address) => address.id))
        : new Set(billingAddresses.map((address) => address.id));
    const validationErrors = validateAddressForm(form);
    if (Object.keys(validationErrors).length > 0) {
      if (addressType === "shipping") {
        setShippingAddressErrors(validationErrors);
        setShippingAddressFormError(null);
      } else {
        setBillingAddressErrors(validationErrors);
        setBillingAddressFormError(null);
      }
      return;
    }

    if (addressType === "shipping") {
      setSavingShippingAddress(true);
      setShippingAddressErrors({});
      setShippingAddressFormError(null);
    } else {
      setSavingBillingAddress(true);
      setBillingAddressErrors({});
      setBillingAddressFormError(null);
    }

    const response = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section: "address",
        addressType,
        addressId: addressId ?? undefined,
        address: form,
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      if (addressType === "shipping") {
        setShippingAddressFormError(payload?.error ?? "Unable to save address.");
        setSavingShippingAddress(false);
      } else {
        setBillingAddressFormError(payload?.error ?? "Unable to save address.");
        setSavingBillingAddress(false);
      }
      return;
    }

    const nextProfile = payload as ProfilePayload;
    setProfileData(nextProfile);
    const newShippingAddressId =
      addressType === "shipping" && addressId === null
        ? nextProfile.shippingAddresses.find((address) => !existingIds.has(address.id))?.id ?? null
        : null;
    const newBillingAddressId =
      addressType === "billing" && addressId === null
        ? nextProfile.billingAddresses.find((address) => !existingIds.has(address.id))?.id ?? null
        : null;
    setSelectedShippingAddressId((current) =>
      newShippingAddressId ??
      nextProfile.shippingAddresses.find((address) => address.id === current)?.id ??
      nextProfile.shippingAddresses.find((address) => address.isDefault)?.id ??
      nextProfile.shippingAddresses[0]?.id ??
      null
    );
    setSelectedBillingAddressId((current) =>
      newBillingAddressId ??
      nextProfile.billingAddresses.find((address) => address.id === current)?.id ??
      nextProfile.billingAddresses.find((address) => address.isDefault)?.id ??
      nextProfile.billingAddresses[0]?.id ??
      null
    );
    setEditingShippingAddressId(null);
    setEditingBillingAddressId(null);
    if (addressType === "shipping") {
      setShippingAddressForm(emptyAddressForm());
      setShowNewShippingAddressForm(false);
    } else {
      setBillingAddressForm(emptyAddressForm());
      setShowNewBillingAddressForm(false);
    }
    setSavingShippingAddress(false);
    setSavingBillingAddress(false);
  }

  async function deleteCheckoutAddress(addressType: "shipping" | "billing", addressId: number) {
    setDeletingAddressId(addressId);

    const response = await fetch("/api/profile", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addressId }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      if (addressType === "shipping") {
        setShippingAddressFormError(payload?.error ?? "Unable to delete address.");
      } else {
        setBillingAddressFormError(payload?.error ?? "Unable to delete address.");
      }
      setDeletingAddressId(null);
      return;
    }

    const nextProfile = payload as ProfilePayload;
    setProfileData(nextProfile);
    setSelectedShippingAddressId(
      nextProfile.shippingAddresses.find((address) => address.id === selectedShippingAddressId)?.id ??
      nextProfile.shippingAddresses.find((address) => address.isDefault)?.id ??
      nextProfile.shippingAddresses[0]?.id ??
      null
    );
    setSelectedBillingAddressId(
      nextProfile.billingAddresses.find((address) => address.id === selectedBillingAddressId)?.id ??
      nextProfile.billingAddresses.find((address) => address.isDefault)?.id ??
      nextProfile.billingAddresses[0]?.id ??
      null
    );
    if (editingShippingAddressId === addressId) {
      setEditingShippingAddressId(null);
      setShippingAddressForm(emptyAddressForm());
    }
    if (editingBillingAddressId === addressId) {
      setEditingBillingAddressId(null);
      setBillingAddressForm(emptyAddressForm());
    }
    setDeletingAddressId(null);
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Your cart</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Review items, update quantities, and proceed to checkout.
          </p>
        </div>

        {items.length === 0 ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 text-center sm:p-10">
            <div className="text-sm text-zinc-600">Your cart is empty.</div>
            <Link
              href="/products"
              className="mt-4 inline-block rounded-full bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-800"
            >
              Browse products
            </Link>
          </div>
        ) : (
          <>
            <div className="grid gap-6 xl:grid-cols-[1.5fr_0.9fr] xl:items-start">
              <ItemsPanel
                items={items}
                onRemove={removeItem}
                onUpdateQty={updateQty}
              />

              <aside className="rounded-[2rem] border border-zinc-200 bg-white p-4 shadow-sm sm:p-6">
                <OrderSummary
                  subtotal={subtotal}
                  totalWeightKg={totalWeightKg}
                  shippingOptions={shippingOptions}
                  selectedShippingModeId={selectedShippingModeId}
                  selectedShippingOption={selectedShippingOption}
                  onSelectShippingMode={setSelectedShippingModeId}
                  shippingError={shippingError}
                  shippingLoading={shippingLoading}
                  radioName="shipping-mode"
                  testIdPrefix="cart"
                />
                <button
                  type="button"
                  onClick={handleCheckoutClick}
                  className={`mt-6 w-full rounded-full px-4 py-2 text-sm transition ${
                    showCheckoutReview
                      ? "bg-zinc-700 text-white ring-2 ring-zinc-300 hover:bg-zinc-800"
                      : "bg-zinc-900 text-white hover:bg-zinc-800"
                  }`}
                >
                  {showCheckoutReview ? "Hide checkout details" : "Checkout"}
                </button>
                <button
                  type="button"
                  onClick={clearCart}
                  className="mt-3 w-full text-xs text-zinc-500 hover:text-zinc-900"
                >
                  Clear cart
                </button>
              </aside>
            </div>

            {showCheckoutReview ? (
              <section
                ref={checkoutReviewRef}
                className={`mt-8 rounded-[2rem] border bg-white p-4 shadow-sm transition-all duration-500 sm:p-5 lg:p-6 ${
                  highlightCheckoutReview
                    ? "border-zinc-900 ring-4 ring-zinc-200"
                    : "border-zinc-200"
                }`}
              >
                {profileLoading ? (
                  <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                    Loading checkout details...
                  </div>
                ) : null}

                {profileError ? (
                  <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {profileError}
                  </div>
                ) : null}

                {profileData ? (
                  <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:items-start">
                    <section className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4 sm:p-5">
                      <h3 className="text-lg font-semibold text-zinc-900">Essential order details</h3>
                      <div className="mt-4">
                        <div>
                          <div className="text-sm font-medium text-zinc-900">Items</div>
                          <div className="mt-3 space-y-3">
                            {items.map((item) => (
                              <div
                                key={`checkout-${item.id}`}
                                className="flex flex-col gap-1 text-sm sm:flex-row sm:items-start sm:justify-between sm:gap-3"
                              >
                                <div>
                                  <div className="font-medium text-zinc-900">{item.name}</div>
                                  <div className="text-zinc-500">
                                    Qty {item.qty}
                                    {item.color ? ` · ${item.color}` : ""}
                                    {item.size ? ` · ${item.size}` : ""}
                                  </div>
                                </div>
                                <div className="font-semibold text-zinc-900">{formatUsd(item.price * item.qty, 2)}</div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-5 border-t border-zinc-200 pt-4">
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center justify-between">
                                <span className="text-zinc-600">Subtotal</span>
                                <span className="font-medium text-zinc-900">{formatUsd(subtotal, 2)}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-zinc-600">Shipping</span>
                                <span className="font-medium text-zinc-900">{formatUsd(selectedShippingOption?.shippingCostUsd ?? 0, 2)}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-zinc-600">Total</span>
                                <span className="font-semibold text-zinc-900">{formatUsd(checkoutOrderTotal, 2)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </section>

                    <section className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4 sm:p-5">
                      <div className="space-y-8">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <h3 className="text-lg font-semibold text-zinc-900">Shipping info</h3>
                            </div>
                          </div>
                          <div className="space-y-4">
                          {shippingAddresses.length === 0 ? (
                            <div className="space-y-3">
                              {!showNewShippingAddressForm ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowNewShippingAddressForm(true);
                                    setShippingAddressForm(emptyAddressForm());
                                    setShippingAddressErrors({});
                                    setShippingAddressFormError(null);
                                  }}
                                  className="rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:border-zinc-500 hover:text-zinc-900"
                                >
                                  Add shipping address
                                </button>
                              ) : (
                                <AddressEditor
                                  values={shippingAddressForm}
                                  onChange={(field, value) => {
                                    setShippingAddressForm((current) => ({ ...current, [field]: value }));
                                    setShippingAddressErrors((current) => ({ ...current, [field]: undefined }));
                                    setShippingAddressFormError(null);
                                  }}
                                  errors={shippingAddressErrors}
                                  formError={shippingAddressFormError}
                                  onSubmit={() => saveAddressEdit("shipping", null, shippingAddressForm)}
                                  onCancel={() => {
                                    setShowNewShippingAddressForm(false);
                                    setShippingAddressForm(emptyAddressForm());
                                    setShippingAddressErrors({});
                                    setShippingAddressFormError(null);
                                  }}
                                  saving={savingShippingAddress}
                                  submitLabel="Save shipping address"
                                />
                              )}
                            </div>
                          ) : (
                            <>
                              {selectedShippingAddress ? (
                                <div className="space-y-3">
                                  <AddressChoiceCard
                                    address={selectedShippingAddress}
                                    selected
                                    onSelect={() => {}}
                                    onEdit={() => {
                                      setShippingAddressForm(addressToForm(selectedShippingAddress));
                                      setShippingAddressErrors({});
                                      setShippingAddressFormError(null);
                                      setEditingShippingAddressId(selectedShippingAddress.id);
                                    }}
                                    onDelete={() => deleteCheckoutAddress("shipping", selectedShippingAddress.id)}
                                    deleting={deletingAddressId === selectedShippingAddress.id}
                                  />
                                  {editingShippingAddressId === selectedShippingAddress.id ? (
                                    <AddressEditor
                                      values={shippingAddressForm}
                                      onChange={(field, value) => {
                                        setShippingAddressForm((current) => ({ ...current, [field]: value }));
                                        setShippingAddressErrors((current) => ({ ...current, [field]: undefined }));
                                        setShippingAddressFormError(null);
                                      }}
                                      errors={shippingAddressErrors}
                                      formError={shippingAddressFormError}
                                      onSubmit={() => saveAddressEdit("shipping", selectedShippingAddress.id, shippingAddressForm)}
                                      onCancel={() => {
                                        setShippingAddressForm(emptyAddressForm());
                                        setEditingShippingAddressId(null);
                                        setShippingAddressErrors({});
                                        setShippingAddressFormError(null);
                                      }}
                                      saving={savingShippingAddress}
                                    />
                                  ) : null}
                                </div>
                              ) : null}

                              {alternativeShippingAddresses.length > 0 ? (
                                <div className="space-y-2">
                                  <div className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
                                    Other saved addresses
                                  </div>
                                  <div className="space-y-2">
                                    {alternativeShippingAddresses.map((address) => (
                                      <CompactAddressOption
                                        key={`checkout-shipping-compact-${address.id}`}
                                        address={address}
                                        selected={false}
                                        onSelect={() => {
                                          setSelectedShippingAddressId(address.id);
                                          if (billingSameAsShipping) {
                                            setSelectedBillingAddressId(address.id);
                                          }
                                        }}
                                        onDelete={() => deleteCheckoutAddress("shipping", address.id)}
                                        deleting={deletingAddressId === address.id}
                                      />
                                    ))}
                                  </div>
                                </div>
                              ) : null}

                              <div className="space-y-3">
                                {!showNewShippingAddressForm ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (shippingAddresses.length >= 2) {
                                          return;
                                        }
                                        setShowNewShippingAddressForm(true);
                                        setShippingAddressForm(emptyAddressForm());
                                        setShippingAddressErrors({});
                                        setShippingAddressFormError(null);
                                      }}
                                      disabled={shippingAddresses.length >= 2}
                                      className="rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:border-zinc-500 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      Add another address
                                    </button>
                                    {shippingAddresses.length >= 2 ? (
                                      <div className="text-xs text-zinc-500">
                                        You can save up to two shipping addresses.
                                      </div>
                                    ) : null}
                                  </>
                                ) : (
                                  <AddressEditor
                                    values={shippingAddressForm}
                                    onChange={(field, value) => {
                                      setShippingAddressForm((current) => ({ ...current, [field]: value }));
                                      setShippingAddressErrors((current) => ({ ...current, [field]: undefined }));
                                      setShippingAddressFormError(null);
                                    }}
                                    errors={shippingAddressErrors}
                                    formError={shippingAddressFormError}
                                    onSubmit={() => saveAddressEdit("shipping", null, shippingAddressForm)}
                                    onCancel={() => {
                                      setShowNewShippingAddressForm(false);
                                      setShippingAddressForm(emptyAddressForm());
                                      setShippingAddressErrors({});
                                      setShippingAddressFormError(null);
                                    }}
                                    saving={savingShippingAddress}
                                    submitLabel="Save shipping address"
                                  />
                                )}
                              </div>
                            </>
                          )}
                          </div>
                        </div>

                        <div className="space-y-4 border-t border-zinc-200 pt-6">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <h3 className="text-lg font-semibold text-zinc-900">Billing info</h3>
                            </div>
                          </div>

                          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                            <label className="flex items-start gap-3 text-sm text-zinc-700">
                              <input
                                type="checkbox"
                                checked={billingSameAsShipping}
                                onChange={(event) => setBillingSameAsShipping(event.target.checked)}
                                className="mt-1"
                              />
                              <span>Billing address is the same as the selected shipping address.</span>
                            </label>
                          </div>

                          {billingSameAsShipping ? (
                            !selectedShippingAddress ? (
                              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                                Select a shipping address first.
                              </div>
                            ) : null
                          ) : null}
                          {!billingSameAsShipping ? (
                            <div className="space-y-4">
                              {billingAddresses.length === 0 ? (
                                  <AddressEditor
                                    values={billingAddressForm}
                                    onChange={(field, value) => {
                                      setBillingAddressForm((current) => ({ ...current, [field]: value }));
                                      setBillingAddressErrors((current) => ({ ...current, [field]: undefined }));
                                      setBillingAddressFormError(null);
                                    }}
                                    errors={billingAddressErrors}
                                    formError={billingAddressFormError}
                                    onSubmit={() => saveAddressEdit("billing", null, billingAddressForm)}
                                    onCancel={() => {
                                      setBillingAddressForm(emptyAddressForm());
                                      setBillingAddressErrors({});
                                      setBillingAddressFormError(null);
                                    }}
                                    saving={savingBillingAddress}
                                    submitLabel="Save billing address"
                                  />
                              ) : (
                                <>
                                  {selectedBillingAddress ? (
                                    <div className="space-y-3">
                                  <AddressChoiceCard
                                    address={selectedBillingAddress}
                                    selected
                                    onSelect={() => {}}
                                        onEdit={() => {
                                          setBillingAddressForm(addressToForm(selectedBillingAddress));
                                          setBillingAddressErrors({});
                                          setBillingAddressFormError(null);
                                          setEditingBillingAddressId(selectedBillingAddress.id);
                                        }}
                                        onDelete={() => deleteCheckoutAddress("billing", selectedBillingAddress.id)}
                                        deleting={deletingAddressId === selectedBillingAddress.id}
                                      />
                                      {editingBillingAddressId === selectedBillingAddress.id ? (
                                        <AddressEditor
                                          values={billingAddressForm}
                                          onChange={(field, value) => {
                                            setBillingAddressForm((current) => ({ ...current, [field]: value }));
                                            setBillingAddressErrors((current) => ({ ...current, [field]: undefined }));
                                            setBillingAddressFormError(null);
                                          }}
                                          errors={billingAddressErrors}
                                          formError={billingAddressFormError}
                                          onSubmit={() => saveAddressEdit("billing", selectedBillingAddress.id, billingAddressForm)}
                                          onCancel={() => {
                                            setBillingAddressForm(emptyAddressForm());
                                            setEditingBillingAddressId(null);
                                            setBillingAddressErrors({});
                                            setBillingAddressFormError(null);
                                          }}
                                          saving={savingBillingAddress}
                                        />
                                      ) : null}
                                    </div>
                                  ) : null}

                                  {alternativeBillingAddresses.length > 0 ? (
                                    <div className="space-y-2">
                                      <div className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
                                        Other saved addresses
                                      </div>
                                      <div className="space-y-2">
                                        {alternativeBillingAddresses.map((address) => (
                                          <CompactAddressOption
                                            key={`checkout-billing-compact-${address.id}`}
                                            address={address}
                                            selected={false}
                                            onSelect={() => setSelectedBillingAddressId(address.id)}
                                            onDelete={() => deleteCheckoutAddress("billing", address.id)}
                                            deleting={deletingAddressId === address.id}
                                          />
                                        ))}
                                      </div>
                                    </div>
                                  ) : null}

                                  <div className="space-y-3">
                                    {!showNewBillingAddressForm ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setShowNewBillingAddressForm(true);
                                          setBillingAddressForm(emptyAddressForm());
                                          setBillingAddressErrors({});
                                          setBillingAddressFormError(null);
                                        }}
                                        className="rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:border-zinc-500 hover:text-zinc-900"
                                      >
                                        Add another address
                                      </button>
                                    ) : (
                                      <AddressEditor
                                        values={billingAddressForm}
                                        onChange={(field, value) => {
                                          setBillingAddressForm((current) => ({ ...current, [field]: value }));
                                          setBillingAddressErrors((current) => ({ ...current, [field]: undefined }));
                                          setBillingAddressFormError(null);
                                        }}
                                        errors={billingAddressErrors}
                                        formError={billingAddressFormError}
                                        onSubmit={() => saveAddressEdit("billing", null, billingAddressForm)}
                                        onCancel={() => {
                                          setShowNewBillingAddressForm(false);
                                          setBillingAddressForm(emptyAddressForm());
                                          setBillingAddressErrors({});
                                          setBillingAddressFormError(null);
                                        }}
                                        saving={savingBillingAddress}
                                        submitLabel="Save billing address"
                                      />
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </section>
                  </div>
                ) : null}
              </section>
            ) : null}

            {showCheckoutReview && profileData ? (
              <section className="mt-6 rounded-[2rem] border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-900">Payment</h3>
                    <p className="mt-1 text-sm text-zinc-600">
                      Pay securely with Stripe Checkout.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleStripeCheckout}
                      disabled={!canStartStripeCheckout || stripeCheckoutLoading}
                      className="rounded-full bg-zinc-900 px-5 py-2 text-sm text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {stripeCheckoutLoading ? "Redirecting..." : "Pay with card"}
                    </button>
                  </div>
                </div>

                {!canStartStripeCheckout ? (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    Add/select a shipping address, set billing details, and choose a shipping option before completing payment.
                  </div>
                ) : null}

                {stripeCheckoutError ? (
                  <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {stripeCheckoutError}
                  </div>
                ) : null}
              </section>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
}

export default function CartPage() {
  return (
    <Suspense fallback={null}>
      <CartPageContent />
    </Suspense>
  );
}
