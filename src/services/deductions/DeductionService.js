import { deductionRepository } from '../../repositories/DeductionRepository.js';
import { deductionTypeCatalogRepository } from '../../repositories/DeductionTypeCatalogRepository.js';
import { sumMinor } from '../../utils/money.js';

export class DeductionService {
  async getAggregateUsedMinor(userId, financialYear, aggregateGroup) {
    const typeCodes = await deductionTypeCatalogRepository.findTypeCodesByAggregateGroup(
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
