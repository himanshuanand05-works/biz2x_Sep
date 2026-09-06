import { deductionRepository } from '../../repositories/DeductionRepository.js';
import { catalogService } from '../policy/CatalogService.js';
import { sumMinor } from '../../utils/money.js';

export class DeductionService {
  async findByUserAndFinancialYear(userId, financialYear, extra = {}) {
    return deductionRepository.findByUserAndFY(userId, financialYear, extra);
  }

  async getAggregateUsedMinor(userId, financialYear, aggregateGroup) {
    const typeCodes = await catalogService.findDeductionTypeCodesByAggregateGroup(
      aggregateGroup
    );
    const rows = await deductionRepository.findByAggregateGroup(
      userId,
      financialYear,
      typeCodes
    );
    return sumMinor(rows.map((r) => r.amountMinor));
  }

}

export const deductionService = new DeductionService();
