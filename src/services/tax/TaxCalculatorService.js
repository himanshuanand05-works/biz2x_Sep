import { deductionService } from '../deductions/DeductionService.js';
import { deductionTypeCatalogRepository } from '../../repositories/DeductionTypeCatalogRepository.js';
import { TaxSimulationResult } from '../../domain/valueObjects/TaxSimulationResult.js';
import { fromMinorUnits, toMinorUnits } from '../../utils/money.js';

/** Computes bounded tax facts before prompting; the LLM never performs tax math. */
export class TaxCalculatorService {
  async calculate80CSavings(user, proposedAdditional, financialYear) {
    const proposedAdditionalMinor =
      typeof proposedAdditional === 'number' ? proposedAdditional : toMinorUnits(proposedAdditional);
    const currentDeclared = await deductionService.getAggregateUsedMinor(user.userId, financialYear, '80C');
    const catalog = await deductionTypeCatalogRepository.findByAggregateGroup('80C');
    const limitMinor = catalog?.maxAggregateMinor ?? 15000000;
    const eligible = Math.min(Math.max(0, proposedAdditionalMinor), Math.max(0, limitMinor - currentDeclared));
    const estimatedSavings = user.taxRegime === 'OLD' ? Math.round(eligible * 0.2) : 0;

    return new TaxSimulationResult({
      financialYear,
      currentDeclared80C: fromMinorUnits(currentDeclared),
      proposedAdditional: fromMinorUnits(proposedAdditionalMinor),
      eligibleDeduction: fromMinorUnits(eligible),
      estimatedSavings: fromMinorUnits(estimatedSavings),
      assumptions: [
        `Tax regime: ${user.taxRegime}`,
        '20% marginal rate (simplified)',
        `80C aggregate limit ${fromMinorUnits(limitMinor)}`
      ],
      refusal: user.taxRegime !== 'OLD',
      reason: user.taxRegime !== 'OLD' ? '80C simulation is only available for the Old Tax Regime.' : null
    });
  }
}

export const taxCalculatorService = new TaxCalculatorService();
