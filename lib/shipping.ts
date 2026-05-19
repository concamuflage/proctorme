export type ShippingMode = {
  id: number;
  mode: string;
  delivery_time: string | null;
  first_kg_cost_rmb: number | null;
  additional_kg_cost_rmb: number | null;
};

export type ShippingOption = ShippingMode & {
  shippingCostUsd: number;
};

export function getBoxWeightKg(clothesWeightKg: number) {
  if (clothesWeightKg <= 0) return 0;
  if (clothesWeightKg <= 1) return 0.25;
  if (clothesWeightKg <= 2) return 0.3;
  if (clothesWeightKg <= 3) return 0.35;
  if (clothesWeightKg <= 4) return 0.4;
  if (clothesWeightKg <= 5) return 0.45;

  const extraKgSteps = Math.ceil(clothesWeightKg) - 5;
  return 0.45 + extraKgSteps * 0.05;
}

export function formatShippingMode(mode: string) {
  if (mode === "hybrid") return "Air Sea Land";
  return mode
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getShippingModeSortOrder(mode: string) {
  if (mode === "air") return 0;
  if (mode === "hybrid") return 1;
  if (mode === "sea_land") return 2;
  return 99;
}

export function calculateShippingCostRmb(totalWeightKg: number, mode: ShippingMode) {
  if (totalWeightKg <= 0) return 0;

  const firstKgCost = mode.first_kg_cost_rmb ?? 0;
  const additionalKgCost = mode.additional_kg_cost_rmb ?? 0;
  const extraWeightKg = Math.max(totalWeightKg - 1, 0);
  const billedAdditionalKg = extraWeightKg > 0 ? Math.ceil(extraWeightKg) : 0;

  return firstKgCost + billedAdditionalKg * additionalKgCost;
}
