import { userRepository } from '../repositories/UserRepository.js';
import { payrollRepository } from '../repositories/PayrollRepository.js';
import { NotFoundError } from '../utils/errors.js';

/** Loads user-scoped context once for routes that need eligibility information. */
export async function userContextLoader(req, res, next) {
  try {
    const row = await userRepository.findById(req.user.userId);
    if (!row) throw new NotFoundError('User not found');
    const latest = await payrollRepository.findLatestCycle(req.user.userId);
    req.context = {
      activeFinancialYear: row.activeFinancialYear,
      latestPayrollCycle: latest?.payrollCycle ?? null
    };
    return next();
  } catch (error) { return next(error); }
}
