export const SERVICE_FEE_RATE = 0.09;

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateServiceFee(subtotalUsd: number) {
  return roundMoney(subtotalUsd * SERVICE_FEE_RATE);
}

export function calculateBookingTotal(subtotalUsd: number) {
  return roundMoney(subtotalUsd + calculateServiceFee(subtotalUsd));
}
