import { NotFoundError } from '../../utils/errors.js';
import { UserService } from './UserService.js';
import { payrollService } from '../payroll/PayrollService.js';

/** Loads the authenticated user's request-scoped context. */
export class UserContextService {
  async load(userId) {
    const user = await UserService.findById(userId);
    if (!user) throw new NotFoundError('User not found');

    const latestPayroll = await payrollService.findLatestCycle(userId);
    return {
      user,
      latestPayrollCycle: latestPayroll?.payrollCycle ?? null
    };
  }
}

export const userContextService = new UserContextService();