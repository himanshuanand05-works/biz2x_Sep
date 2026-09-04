import { EligibilityResult } from '../../domain/valueObjects/EligibilityResult.js';
import { DeductionScope, DeductionSource, DeductionStatus } from '../../domain/enums.js';
import { deductionTypeCatalogRepository } from '../../repositories/DeductionTypeCatalogRepository.js';
import { deductionRepository } from '../../repositories/DeductionRepository.js';
import { NotFoundError } from '../../utils/errors.js';
import { fromMinorUnits } from '../../utils/money.js';

export class DeductionEligibilityService {
  /**
   * Validates a proposed deduction BEFORE persist.
   */
  async validateAdd(user, { typeCode, amountMinor, financialYear, payrollCycle, declaredUnderRegime }) {
    const catalog = await deductionTypeCatalogRepository.findActive(typeCode);
    const messages = [];
    if (!catalog) {
      return new EligibilityResult({
        isEligible: false,
        isValidUnderPolicy: false,
        allowedAmountMinor: 0,
        requestedAmountMinor: amountMinor,
        remainingHeadroomMinor: 0,
        messages: ['Unknown or inactive deduction type.'],
        policyVersion: null
      });
    }

    const ctx = user.getEligibilityContext();
    const today = new Date().toISOString().slice(0, 10);
    if (catalog.effectiveFrom && catalog.effectiveFrom > today) {
      messages.push('Catalog is not yet effective.');
    }
    if (catalog.effectiveTo && catalog.effectiveTo < today) {
      messages.push('Catalog is no longer effective.');
    }
    if (!catalog.applicableStatuses?.includes(ctx.employmentStatus)) {
      messages.push('Employment status is not eligible for this type.');
    }
    if (!catalog.applicableEmployeeTypes?.includes(ctx.employeeType)) {
      messages.push('Employee type is not eligible for this type.');
    }
    if (catalog.applicableRanks && !catalog.applicableRanks.includes(ctx.rank)) {
      messages.push('Rank/band is not eligible for this type.');
    }
    if (ctx.tenureMonths < (catalog.minTenureMonths ?? 0)) {
      messages.push('Minimum tenure not met.');
    }
    const regime = declaredUnderRegime ?? user.taxRegime;
    if (!catalog.applicableRegimes?.includes(regime)) {
      messages.push(`Type is not applicable under ${regime} tax regime.`);
    }
    if (user.taxRegimeLocked && catalog.scope === DeductionScope.TAX_DECLARATION) {
      messages.push('Tax regime is locked; new declarations are not allowed.');
    }
    if (amountMinor < (catalog.minAmountMinor ?? 0)) {
      messages.push('Amount is below the minimum allowed.');
    }
    if (catalog.maxAmountMinor != null && amountMinor > catalog.maxAmountMinor) {
      messages.push('Amount exceeds the per-entry maximum.');
    }
    if (catalog.scope === DeductionScope.PAYROLL && !payrollCycle) {
      messages.push('payrollCycle is required for PAYROLL scope.');
    }
    if (catalog.scope === DeductionScope.TAX_DECLARATION && !financialYear) {
      messages.push('financialYear is required for tax declarations.');
    }

    let remainingHeadroomMinor = null;
    if (catalog.aggregateGroup && catalog.maxAggregateMinor != null) {
      const used = await this._getRemainingAggregate(user, catalog, financialYear);
      remainingHeadroomMinor = used;
      if (amountMinor > remainingHeadroomMinor) {
        messages.push(
          `Exceeds ${catalog.aggregateGroup} aggregate limit. Headroom ${fromMinorUnits(remainingHeadroomMinor)}.`
        );
      }
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

  async validateRemove(user, deductionId) {
    const row = await deductionRepository.findByUserAndId(user.userId, deductionId);
    if (!row) {
      throw new NotFoundError('Deduction not found');
    }
    if (row.source === DeductionSource.PAYROLL_IMPORT || row.status === DeductionStatus.APPLIED) {
      return new EligibilityResult({
        isEligible: false,
        isValidUnderPolicy: false,
        allowedAmountMinor: 0,
        requestedAmountMinor: row.amountMinor,
        remainingHeadroomMinor: 0,
        messages: ['Applied or payroll-imported deductions cannot be removed.'],
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

  async getAvailableTypes(user, { scope, financialYear }) {
    const extra = scope ? { scope } : {};
    const catalogs = await deductionTypeCatalogRepository.findAllActive(extra);
    const out = [];
    for (const c of catalogs) {
      if (!this._matchesUserContext(c, user)) {
        continue;
      }
      if (!c.applicableRegimes?.includes(user.taxRegime)) {
        continue;
      }
      const remaining = await this._getRemainingAggregate(user, c, financialYear);
      out.push({
        typeCode: c.typeCode,
        displayName: c.displayName,
        description: c.description,
        minAmount: fromMinorUnits(c.minAmountMinor ?? 0),
        maxAmount: c.maxAmountMinor != null ? fromMinorUnits(c.maxAmountMinor) : null,
        maxAggregate: c.maxAggregateMinor != null ? fromMinorUnits(c.maxAggregateMinor) : null,
        remainingHeadroom: remaining != null ? fromMinorUnits(remaining) : null,
        requiresProof: c.requiresProof,
        policyVersion: c.policyVersion
      });
    }
    return out;
  }

  _matchesUserContext(catalog, user) {
    const ctx = user.getEligibilityContext();
    if (!catalog.applicableStatuses?.includes(ctx.employmentStatus)) {
      return false;
    }
    if (!catalog.applicableEmployeeTypes?.includes(ctx.employeeType)) {
      return false;
    }
    if (catalog.applicableRanks && !catalog.applicableRanks.includes(ctx.rank)) {
      return false;
    }
    if (ctx.tenureMonths < (catalog.minTenureMonths ?? 0)) {
      return false;
    }
    return true;
  }

  /**
   * Remaining room under aggregate cap, or null if uncapped.
   */
  async _getRemainingAggregate(user, catalog, financialYear) {
    if (!catalog.aggregateGroup || catalog.maxAggregateMinor == null) {
      return null;
    }
    const typeCodes = await deductionTypeCatalogRepository.findTypeCodesByAggregateGroup(
      catalog.aggregateGroup
    );
    const rows = await deductionRepository.findByAggregateGroup(
      user.userId,
      financialYear,
      typeCodes
    );
    const used = rows.reduce((s, r) => s + r.amountMinor, 0);
    return Math.max(0, catalog.maxAggregateMinor - used);
  }
}

export const deductionEligibilityService = new DeductionEligibilityService();
