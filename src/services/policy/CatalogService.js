import { deductionTypeCatalogRepository } from '../../repositories/DeductionTypeCatalogRepository.js';
import { reimbursementTypeCatalogRepository } from '../../repositories/ReimbursementTypeCatalogRepository.js';

/** Owns policy catalog persistence access for domain services. */
export class CatalogService {
  async findDeductionByCode(typeCode) {
    return deductionTypeCatalogRepository.findByCode(typeCode);
  }

  async findDeductionTypeCodesByAggregateGroup(aggregateGroup) {
    return deductionTypeCatalogRepository.findTypeCodesByAggregateGroup(aggregateGroup);
  }

  async findDeductionAggregateGroup(aggregateGroup) {
    return deductionTypeCatalogRepository.findByAggregateGroup(aggregateGroup);
  }

  async findReimbursementActive(typeCode) {
    return reimbursementTypeCatalogRepository.findActive(typeCode);
  }
}

export const catalogService = new CatalogService();
