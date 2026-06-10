/**
 * Formats usd for display.
 *
 * @param value - Input used by format usd.
 * @param maxFractionDigits - Input used by format usd.
 *
 * @returns The formatted display value.
 */
export function formatUsd(value: number, maxFractionDigits = 0) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: maxFractionDigits,
  }).format(value);
}