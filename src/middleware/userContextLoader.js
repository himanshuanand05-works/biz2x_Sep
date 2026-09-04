import { userRepository } from '../repositories/UserRepository.js';
import { payrollRepository } from '../repositories/PayrollRepository.js';
import { User } from '../domain/User.js';
import { deductionEligibilityService } from '../services/deductions/DeductionEligibilityService.js';
import { reimbursementEligibilityService } from '../services/reimbursements/ReimbursementEligibilityService.js';
import { NotFoundError } from '../utils/errors.js';

/** Loads user-scoped context once for routes that need eligibility information. */
export async function userContextLoader(req, res, next) {
  try {
    const row = await userRepository.findById(req.user.userId);
    if (!row) throw new NotFoundError('User not found');
    const user = new User(row);
    const latest = await payrollRepository.findLatestCycle(req.user.userId);
    req.context = {
      user,
      activeFinancialYear: row.activeFinancialYear,
      latestPayrollCycle: latest?.payrollCycle ?? null,
      availableDeductionTypes: await deductionEligibilityService.getAvailableTypes(user, { financialYear: row.activeFinancialYear }),
      availableReimbursementTypes: await reimbursementEligibilityService.getAvailableTypes(user, row.activeFinancialYear)
    };
    return next();
  } catch (error) { return next(error); }
}
