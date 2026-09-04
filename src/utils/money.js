/**
 * Monetary precision helpers.
 * All payroll/tax math uses integer minor units (paise). Convert only at API/AI boundaries.
 */

const SCALE = 100;

/**
 * Converts a decimal rupee amount to integer paise.
 * @param {string|number} decimal - e.g. "45000.50" or 45000.5 from validated input
 * @returns {number} integer minor units (paise)
 */
export function toMinorUnits(decimal) {
  const asString = typeof decimal === 'number' ? decimal.toFixed(2) : String(decimal).trim();
  const match = asString.match(/^(-?)(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) {
    throw new Error('Invalid money amount');
  }
  const sign = match[1] === '-' ? -1 : 1;
  const rupees = Number(match[2]);
  const fraction = (match[3] ?? '00').padEnd(2, '0');
  return sign * (rupees * SCALE + Number(fraction));
}

/**
 * Formats minor units as a two-decimal string (never a float).
 * @param {number} minorUnits
 * @returns {string}
 */
export function fromMinorUnits(minorUnits) {
  const sign = minorUnits < 0 ? '-' : '';
  const abs = Math.abs(Math.trunc(minorUnits));
  const rupees = Math.floor(abs / SCALE);
  const paise = String(abs % SCALE).padStart(2, '0');
  return `${sign}${rupees}.${paise}`;
}

/** @param {number} a @param {number} b */
export function addMinor(a, b) {
  return a + b;
}

/** @param {number} a @param {number} b */
export function subtractMinor(a, b) {
  return a - b;
}

/** @param {number[]} values */
export function sumMinor(values) {
  return values.reduce((s, v) => s + v, 0);
}

/**
 * Percentage via scaled integer: rateBps = 2000 → 20.00%.
 * Uses half-up rounding on the division remainder.
 * @param {number} amountMinor
 * @param {number} rateBps
 */
export function applyRateBps(amountMinor, rateBps) {
  return Math.round((amountMinor * rateBps) / 10000);
}
