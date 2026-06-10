export const SERVICE_FEE_RATE = 0.09;

/**
 * Runs the round money logic for this module.
 *
 * @param value - Input used by round money.
 *
 * @returns The result used by the surrounding flow.
 */
export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Runs the calculate service fee logic for this module.
 *
 * @param subtotalUsd - Input used by calculate service fee.
 *
 * @returns The result used by the surrounding flow.
 */
export function calculateServiceFee(subtotalUsd: number) {
  return roundMoney(subtotalUsd * SERVICE_FEE_RATE);
}

/**
 * Runs the calculate booking total logic for this module.
 *
 * @param subtotalUsd - Input used by calculate booking total.
 *
 * @returns The result used by the surrounding flow.
 */
export function calculateBookingTotal(subtotalUsd: number) {
  return roundMoney(subtotalUsd + calculateServiceFee(subtotalUsd));
}
