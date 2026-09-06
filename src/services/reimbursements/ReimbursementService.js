import { reimbursementRepository } from '../../repositories/ReimbursementRepository.js';

/** Owns reimbursement persistence access for reimbursement-related use cases. */
export class ReimbursementService {
  async findByUser(userId, filters = {}) {
    return reimbursementRepository.find(userId, filters);
  }

  async sumByUserTypeFY(userId, typeCode, financialYear) {
    return reimbursementRepository.sumByUserTypeFY(userId, typeCode, financialYear);
  }
}

export const reimbursementService = new ReimbursementService();
