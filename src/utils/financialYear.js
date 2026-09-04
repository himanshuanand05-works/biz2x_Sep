/**
 * Indian financial year helpers (1 Apr – 31 Mar).
 */

/**
 * @param {Date|string} [asOf]
 * @returns {string} e.g. '2026-2027'
 */
export function getFinancialYear(asOf = new Date()) {
  const date = asOf instanceof Date ? asOf : new Date(asOf);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth(); // 0-indexed
  const startYear = month >= 3 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

/**
 * @param {Date|string} [asOf]
 * @returns {string} e.g. '2026-04'
 */
export function getPayrollCycle(asOf = new Date()) {
  const date = asOf instanceof Date ? asOf : new Date(asOf);
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${date.getUTCFullYear()}-${month}`;
}

/**
 * FY that contains a payroll cycle key.
 * @param {string} payrollCycle YYYY-MM
 * @returns {string}
 */
export function financialYearFromCycle(payrollCycle) {
  const [yearStr, monthStr] = payrollCycle.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const startYear = month >= 4 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}
