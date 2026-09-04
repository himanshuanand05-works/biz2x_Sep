/**
 * Read-only tax simulation facts passed to the LLM — never invented by the model.
 */
export class TaxSimulationResult {
  constructor({
    financialYear,
    currentDeclared80C,
    proposedAdditional,
    eligibleDeduction,
    estimatedSavings,
    assumptions,
    disclaimer,
    refusal = false,
    reason = null
  }) {
    this.financialYear = financialYear;
    this.currentDeclared80C = currentDeclared80C;
    this.proposedAdditional = proposedAdditional;
    this.eligibleDeduction = eligibleDeduction;
    this.estimatedSavings = estimatedSavings;
    this.assumptions = assumptions;
    this.disclaimer =
      disclaimer ?? 'Simplified Old Tax Regime estimate. Not legal or compliance advice.';
    this.refusal = refusal;
    this.reason = reason;
  }
}
