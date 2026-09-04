import { EligibilityResult } from '../../domain/valueObjects/EligibilityResult.js';
import { reimbursementTypeCatalogRepository } from '../../repositories/ReimbursementTypeCatalogRepository.js';
import { reimbursementRepository } from '../../repositories/ReimbursementRepository.js';
import { fromMinorUnits } from '../../utils/money.js';
import { NotFoundError } from '../../utils/errors.js';

export class ReimbursementEligibilityService {
  async validateClaim(user, { typeCode, amountMinor, financialYear, payrollCycle }) {
    const catalog = await reimbursementTypeCatalogRepository.findActive(typeCode);
    const messages = [];
    if (!catalog) {
      return new EligibilityResult({
        isEligible: false,
        isValidUnderPolicy: false,
        allowedAmountMinor: 0,
        requestedAmountMinor: amountMinor,
        remainingHeadroomMinor: 0,
        messages: ['Unknown or inactive reimbursement type.'],
        policyVersion: null
      });
    }

    const ctx = user.getEligibilityContext();
    if (!catalog.applicableStatuses?.includes(ctx.employmentStatus)) {
      messages.push('Employment status is not eligible.');
    }
    if (catalog.applicableRanks && !catalog.applicableRanks.includes(ctx.rank)) {
      messages.push('Rank/band is not eligible.');
    }
    if (ctx.tenureMonths < (catalog.minTenureMonths ?? 0)) {
      messages.push('Minimum tenure not met.');
    }
    if (amountMinor < (catalog.minAmountMinor ?? 0)) {
      messages.push('Amount is below the minimum allowed.');
    }
    if (catalog.maxAmountMinor != null && amountMinor > catalog.maxAmountMinor) {
      messages.push('Amount exceeds the per-claim maximum.');
    }
    if (!payrollCycle) {
      messages.push('payrollCycle is required.');
    }

    const usedFy = await reimbursementRepository.sumByUserTypeFY(
      user.userId,
      typeCode,
      financialYear
    );
    let remainingHeadroomMinor =
      catalog.maxPerFyMinor != null ? Math.max(0, catalog.maxPerFyMinor - usedFy) : null;
    if (remainingHeadroomMinor != null && amountMinor > remainingHeadroomMinor) {
      messages.push(
        `Exceeds FY cap. Headroom ${fromMinorUnits(remainingHeadroomMinor)}.`
      );
    }

    const valid = messages.length === 0;
    return new EligibilityResult({
      isEligible: valid,
      isValidUnderPolicy: valid,
      allowedAmountMinor: valid ? amountMinor : 0,
      requestedAmountMinor: amountMinor,
      remainingHeadroomMinor,
      messages,
      policyVersion: catalog.policyVersion,
      applicableCatalog: catalog
    });
  }

  async validateRemove(user, reimbursementId) {
    const row = await reimbursementRepository.findByUserAndId(user.userId, reimbursementId);
    if (!row) {
      throw new NotFoundError('Reimbursement not found');
    }
    if (['PAID', 'APPROVED'].includes(row.status)) {
      return new EligibilityResult({
        isEligible: false,
        isValidUnderPolicy: false,
        allowedAmountMinor: 0,
        requestedAmountMinor: row.amountMinor,
        remainingHeadroomMinor: 0,
        messages: ['Approved or paid claims cannot be deleted.'],
        policyVersion: row.policyVersionAtCreation
      });
    }
    return new EligibilityResult({
      isEligible: true,
      isValidUnderPolicy: true,
      allowedAmountMinor: row.amountMinor,
      requestedAmountMinor: row.amountMinor,
      remainingHeadroomMinor: 0,
      messages: [],
      policyVersion: row.policyVersionAtCreation
    });
  }

  async getRemainingHeadroom(user, typeCode, financialYear) {
    const catalog = await reimbursementTypeCatalogRepository.findActive(typeCode);
    if (!catalog || catalog.maxPerFyMinor == null) {
      return null;
    }
    const used = await reimbursementRepository.sumByUserTypeFY(
      user.userId,
      typeCode,
      financialYear
    );
    return Math.max(0, catalog.maxPerFyMinor - used);
  }

  async getAvailableTypes(user, financialYear) {
    const catalogs = await reimbursementTypeCatalogRepository.findAllActive();
    const out = [];
    for (const c of catalogs) {
      const ctx = user.getEligibilityContext();
      if (!c.applicableStatuses?.includes(ctx.employmentStatus)) {
        continue;
      }
      if (c.applicableRanks && !c.applicableRanks.includes(ctx.rank)) {
        continue;
      }
      if (ctx.tenureMonths < (c.minTenureMonths ?? 0)) {
        continue;
      }
      const remaining = await this.getRemainingHeadroom(user, c.typeCode, financialYear);
      out.push({
        typeCode: c.typeCode,
        displayName: c.displayName,
        description: c.description,
        minAmount: fromMinorUnits(c.minAmountMinor ?? 0),
        maxAmount: c.maxAmountMinor != null ? fromMinorUnits(c.maxAmountMinor) : null,
        remainingHeadroom: remaining != null ? fromMinorUnits(remaining) : null,
        requiresProof: c.requiresProof,
        policyVersion: c.policyVersion
      });
    }
    return out;
  }
}

export const reimbursementEligibilityService = new ReimbursementEligibilityService();
