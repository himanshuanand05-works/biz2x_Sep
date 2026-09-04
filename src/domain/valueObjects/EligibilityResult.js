/**
 * Eligibility outcome from deduction/reimbursement policy checks.
 */
export class EligibilityResult {
  constructor({
    isEligible,
    isValidUnderPolicy,
    allowedAmountMinor,
    requestedAmountMinor,
    remainingHeadroomMinor,
    messages = [],
    policyVersion,
    applicableCatalog = null
  }) {
    this.isEligible = isEligible;
    this.isValidUnderPolicy = isValidUnderPolicy;
    this.allowedAmountMinor = allowedAmountMinor;
    this.requestedAmountMinor = requestedAmountMinor;
    this.remainingHeadroomMinor = remainingHeadroomMinor;
    this.messages = messages;
    this.policyVersion = policyVersion;
    this.applicableCatalog = applicableCatalog;
  }
}
