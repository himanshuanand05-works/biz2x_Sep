import { userRepository } from '../../repositories/UserRepository.js';
import { payrollRepository } from '../../repositories/PayrollRepository.js';
import { NotFoundError } from '../../utils/errors.js';

/** Loads the authenticated user's request-scoped context. */
export class UserContextService {
  async load(userId) {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError('User not found');

    const latestPayroll = await payrollRepository.findLatestCycle(userId);
    return {
      user,
      latestPayrollCycle: latestPayroll?.payrollCycle ?? null
    };
  }
}

export const userContextService = new UserContextService();