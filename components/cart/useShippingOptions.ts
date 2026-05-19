"use client";

import { useEffect, useMemo, useState } from "react";
import {
  calculateShippingCostRmb,
  getShippingModeSortOrder,
  type ShippingMode,
  type ShippingOption,
} from "@/lib/shipping";
import { CLIENT_API_BASE_PATH } from "@/lib/api-base";

const RMB_TO_USD = Number(process.env.NEXT_PUBLIC_RMB_TO_USD ?? "0.14");

export function useShippingOptions(
  totalWeightKg: number,
  selectedShippingModeId: number | null,
  setSelectedShippingModeId: (id: number | null) => void
) {
  const [shippingModes, setShippingModes] = useState<ShippingMode[]>([]);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [shippingLoading, setShippingLoading] = useState(false);

  useEffect(() => {
    const fetchShippingModes = async () => {
      setShippingLoading(true);
      setShippingError(null);
      try {
        const res = await fetch(`${CLIENT_API_BASE_PATH}/shipping/costs`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const nextModes = Array.isArray(data) ? data : [];
        setShippingModes(nextModes);
      } catch (error: unknown) {
        setShippingModes([]);
        setShippingError(error instanceof Error ? error.message : "Failed to load shipping.");
      } finally {
        setShippingLoading(false);
      }
    };

    void fetchShippingModes();
  }, []);

  useEffect(() => {
    if (shippingModes.length === 0 || selectedShippingModeId != null) {
      return;
    }

    setSelectedShippingModeId(shippingModes[0]?.id ?? null);
  }, [selectedShippingModeId, setSelectedShippingModeId, shippingModes]);

  const shippingOptions = useMemo<ShippingOption[]>(() => {
    return shippingModes
      .map((mode) => ({
        ...mode,
        shippingCostUsd: calculateShippingCostRmb(totalWeightKg, mode) * RMB_TO_USD,
      }))
      .sort((a, b) => getShippingModeSortOrder(a.mode) - getShippingModeSortOrder(b.mode));
  }, [shippingModes, totalWeightKg]);

  const selectedShippingOption = useMemo(() => {
    return shippingOptions.find((option) => option.id === selectedShippingModeId) ?? null;
  }, [selectedShippingModeId, shippingOptions]);

  return {
    shippingError,
    shippingLoading,
    shippingOptions,
    selectedShippingModeId,
    selectedShippingOption,
    setSelectedShippingModeId,
  };
}
