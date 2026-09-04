/**
 * Read-only access to versioned policy catalogs.
 */
import { deductionTypeCatalogRepository } from '../../repositories/DeductionTypeCatalogRepository.js';
import { reimbursementTypeCatalogRepository } from '../../repositories/ReimbursementTypeCatalogRepository.js';

export class PolicyCatalogService {
  async listDeductionTypes(filters = {}) {
    return deductionTypeCatalogRepository.findAllActive(filters);
  }

  async listReimbursementTypes() {
    return reimbursementTypeCatalogRepository.findAllActive();
  }

  async getDeductionType(typeCode) {
    return deductionTypeCatalogRepository.findByCode(typeCode);
  }

  async getReimbursementType(typeCode) {
    return reimbursementTypeCatalogRepository.findById(typeCode);
  }
}

export const policyCatalogService = new PolicyCatalogService();
