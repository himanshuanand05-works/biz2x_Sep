import { reimbursementRepository } from '../../repositories/ReimbursementRepository.js';
import { userRepository } from '../../repositories/UserRepository.js';
import { userDocumentRepository } from '../../repositories/UserDocumentRepository.js';
import { reimbursementEligibilityService } from './ReimbursementEligibilityService.js';
import { User } from '../../domain/User.js';
import { LinkedEntityType, ReimbursementStatus } from '../../domain/enums.js';
import { createId } from '../../utils/ids.js';
import { toMinorUnits, fromMinorUnits } from '../../utils/money.js';
import { financialYearFromCycle, getFinancialYear } from '../../utils/financialYear.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../../utils/errors.js';

export class ReimbursementService {
  async listByUser(userId, filters = {}) {
    const rows = await reimbursementRepository.find(userId, filters);
    return rows.map((r) => ({
      ...r,
      amount: fromMinorUnits(r.amountMinor)
    }));
  }

  async createClaim(userId, payload) {
    const user = new User(await userRepository.findById(userId));
    const amountMinor = toMinorUnits(payload.amount);
    const financialYear =
      payload.financialYear ??
      (payload.payrollCycle
        ? financialYearFromCycle(payload.payrollCycle)
        : getFinancialYear(payload.claimDate));
    const eligibility = await reimbursementEligibilityService.validateClaim(user, {
      typeCode: payload.typeCode,
      amountMinor,
      financialYear,
      payrollCycle: payload.payrollCycle
    });
    if (!eligibility.isValidUnderPolicy) {
      throw new ValidationError('Claim is not valid under policy', eligibility.messages);
    }
    return reimbursementRepository.create({
      reimbursementId: createId('rmb'),
      userId,
      typeCode: payload.typeCode,
      claimDate: payload.claimDate,
      payrollCycle: payload.payrollCycle,
      financialYear,
      amountMinor,
      description: payload.description ?? null,
      isEligible: eligibility.isEligible,
      isValidUnderPolicy: eligibility.isValidUnderPolicy,
      validationMessages: eligibility.messages,
      policyVersionAtCreation: eligibility.policyVersion,
      status: ReimbursementStatus.DRAFT,
      createdBy: userId,
      updatedBy: userId
    });
  }

  async attachProof(userId, reimbursementId, documentId) {
    const claim = await reimbursementRepository.findByUserAndId(userId, reimbursementId);
    if (!claim) {
      throw new NotFoundError('Reimbursement not found');
    }
    const doc = await userDocumentRepository.findByUserAndId(userId, documentId);
    if (!doc) {
      throw new NotFoundError('Document not found');
    }
    await userDocumentRepository.update(userId, documentId, {
      linkedEntityType: LinkedEntityType.REIMBURSEMENT,
      linkedEntityId: reimbursementId,
      updatedBy: userId
    });
    return reimbursementRepository.update(userId, reimbursementId, {
      proofDocumentId: documentId,
      status: ReimbursementStatus.SUBMITTED,
      updatedBy: userId
    });
  }

  async softDelete(reimbursementId, userId) {
    const user = new User(await userRepository.findById(userId));
    const eligibility = await reimbursementEligibilityService.validateRemove(
      user,
      reimbursementId
    );
    if (!eligibility.isValidUnderPolicy) {
      throw new ForbiddenError(eligibility.messages[0] ?? 'Cannot delete this claim');
    }
    return reimbursementRepository.delete(userId, reimbursementId);
  }
}

export const reimbursementService = new ReimbursementService();
