import { deductionRepository } from '../../repositories/DeductionRepository.js';
import { deductionTypeCatalogRepository } from '../../repositories/DeductionTypeCatalogRepository.js';
import { userRepository } from '../../repositories/UserRepository.js';
import { deductionEligibilityService } from './DeductionEligibilityService.js';
import { User } from '../../domain/User.js';
import { DeductionScope } from '../../domain/enums.js';
import { createId } from '../../utils/ids.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../../utils/errors.js';
import { fromMinorUnits, sumMinor, toMinorUnits } from '../../utils/money.js';

export class DeductionService {
  async list(userId, filters = {}) {
    return deductionRepository.find(userId, filters);
  }

  async getById(userId, deductionId) {
    const row = await deductionRepository.findById(deductionId);
    if (!row || row.userId !== userId) {
      throw new NotFoundError('Deduction not found');
    }
    return row;
  }

  async create(userId, payload, actorUserId) {
    const userRow = await userRepository.findById(userId);
    const user = new User(userRow);
    const amountMinor =
      payload.amountMinor ?? toMinorUnits(payload.amount);
    const catalog = await deductionTypeCatalogRepository.findActive(payload.typeCode);
    if (!catalog) {
      throw new ValidationError('Unknown deduction type');
    }
    const eligibility = await deductionEligibilityService.validateAdd(user, {
      typeCode: payload.typeCode,
      amountMinor,
      financialYear: payload.financialYear,
      payrollCycle: payload.payrollCycle,
      declaredUnderRegime: payload.declaredUnderRegime ?? user.taxRegime
    });
    if (!eligibility.isValidUnderPolicy) {
      throw new ValidationError('Deduction is not valid under policy', eligibility.messages);
    }
    return deductionRepository.create({
      deductionId: createId('ded'),
      userId,
      typeCode: payload.typeCode,
      scope: catalog.scope,
      amountMinor,
      currency: 'INR',
      payrollCycle: payload.payrollCycle ?? null,
      financialYear: payload.financialYear,
      startDate: payload.startDate ?? null,
      endDate: payload.endDate ?? null,
      declaredUnderRegime: payload.declaredUnderRegime ?? user.taxRegime,
      isValidUnderPolicy: eligibility.isValidUnderPolicy,
      validationMessages: eligibility.messages,
      policyVersionAtCreation: eligibility.policyVersion,
      status: payload.status ?? 'DECLARED',
      source: payload.source ?? 'EMPLOYEE',
      notes: payload.notes ?? null,
      createdBy: actorUserId,
      updatedBy: actorUserId
    });
  }

  async update(userId, deductionId, payload, actorUserId) {
    const existing = await this.getById(userId, deductionId);
    const user = new User(await userRepository.findById(userId));
    const amountMinor =
      payload.amount != null ? toMinorUnits(payload.amount) : existing.amountMinor;
    const eligibility = await deductionEligibilityService.validateAdd(user, {
      typeCode: payload.typeCode ?? existing.typeCode,
      amountMinor,
      financialYear: payload.financialYear ?? existing.financialYear,
      payrollCycle: payload.payrollCycle ?? existing.payrollCycle,
      declaredUnderRegime: payload.declaredUnderRegime ?? existing.declaredUnderRegime
    });
    if (!eligibility.isValidUnderPolicy) {
      throw new ValidationError('Deduction is not valid under policy', eligibility.messages);
    }
    return deductionRepository.update(deductionId, {
      ...payload,
      amountMinor,
      isValidUnderPolicy: eligibility.isValidUnderPolicy,
      validationMessages: eligibility.messages,
      updatedBy: actorUserId
    });
  }

  async softDelete(deductionId, userId, actorUserId) {
    const user = new User(await userRepository.findById(userId));
    const eligibility = await deductionEligibilityService.validateRemove(user, deductionId);
    if (!eligibility.isValidUnderPolicy) {
      throw new ForbiddenError(eligibility.messages[0] ?? 'Cannot delete this deduction');
    }
    await deductionRepository.update(deductionId, { updatedBy: actorUserId });
    return deductionRepository.delete(deductionId);
  }

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

  async getAggregateSummary(userId, financialYear) {
    const groups = await deductionTypeCatalogRepository.findDistinctAggregateGroups();
    const summary = {};
    for (const group of groups) {
      const catalog = await deductionTypeCatalogRepository.findByAggregateGroup(group);
      const used = await this.getAggregateUsedMinor(userId, financialYear, group);
      const limit = catalog?.maxAggregateMinor ?? null;
      summary[group] = {
        usedMinor: used,
        usedDisplay: fromMinorUnits(used),
        limitDisplay: limit != null ? fromMinorUnits(limit) : null,
        remainingDisplay:
          limit != null ? fromMinorUnits(Math.max(0, limit - used)) : null
      };
    }
    return summary;
  }

  /** @deprecated use getAggregateUsedMinor with aggregateGroup '80C' */
  async getCurrentDeclared80C(userId, financialYear) {
    return this.getAggregateUsedMinor(userId, financialYear, '80C');
  }

  async listPublic(userId, rows) {
    return Promise.all(
      rows.map(async (d) => {
        const catalog = await deductionTypeCatalogRepository.findByCode(d.typeCode);
        return {
          deductionId: d.deductionId,
          typeCode: d.typeCode,
          displayName: catalog?.displayName,
          scope: d.scope,
          amount: fromMinorUnits(d.amountMinor),
          payrollCycle: d.payrollCycle,
          financialYear: d.financialYear,
          status: d.status,
          isValidUnderPolicy: d.isValidUnderPolicy,
          validationMessages: d.validationMessages,
          proofDocumentId: d.proofDocumentId,
          requiresProof: catalog?.requiresProof ?? false
        };
      })
    );
  }
}

export const deductionService = new DeductionService();
