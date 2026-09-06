import { payrollRepository } from '../../repositories/PayrollRepository.js';

/** Owns payroll persistence access for payroll-related use cases. */
export class PayrollService {
  async findByUserAndCycle(userId, payrollCycle) {
    return payrollRepository.findByUserAndCycle(userId, payrollCycle);
  }

  async findLatestCycle(userId) {
    return payrollRepository.findLatestCycle(userId);
  }

  async findByUserAndFinancialYear(userId, financialYear) {
    return payrollRepository.findByUserAndFy(userId, financialYear);
  }
}

export const payrollService = new PayrollService();
