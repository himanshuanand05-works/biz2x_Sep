import { UserService } from '../identity/UserService.js';
import { userRepository } from '../../repositories/UserRepository.js';
import { payrollRepository } from '../../repositories/PayrollRepository.js';
import { deductionRepository } from '../../repositories/DeductionRepository.js';
import { reimbursementRepository } from '../../repositories/ReimbursementRepository.js';
import { userDocumentRepository } from '../../repositories/UserDocumentRepository.js';
import { deductionTypeCatalogRepository } from '../../repositories/DeductionTypeCatalogRepository.js';
import { companyPolicyService } from '../policy/CompanyPolicyService.js';
import { fromMinorUnits } from '../../utils/money.js';
import { NotFoundError } from '../../utils/errors.js';
import { logger } from '../../config/logger.js';

/** Builds a read-only, employee-scoped context for the grounded prompt. */
export class ContextAssembler {
  async assemble(userId, { payrollCycle, financialYear, documentId, uploadedDocument, policyQuery = '', tools = ['profile', 'payroll', 'deductions', 'reimbursements', 'documents'] } = {}) {
    const userRow = await userRepository.findById(userId);
    if (!userRow) throw new NotFoundError('User not found');
    const user = new UserService(userRow);
    const fy = financialYear ?? user.activeFinancialYear;
    const requestedTools = new Set(tools);
    const needsPayroll = requestedTools.has('payroll') || requestedTools.has('payrollComparison') || requestedTools.has('ytd');
    const payroll = needsPayroll
      ? (payrollCycle
        ? await payrollRepository.findByUserAndCycle(userId, payrollCycle)
        : await payrollRepository.findLatestCycle(userId))
      : null;
    const payrollComparison = requestedTools.has('payrollComparison')
      ? await this.getPayrollComparison(userId, fy, payrollCycle)
      : [];
    const deductions = requestedTools.has('deductions')
      ? await deductionRepository.findByUserAndFY(userId, fy)
      : [];
    const reimbursements = requestedTools.has('reimbursements')
      ? await reimbursementRepository.find(userId, { financialYear: fy })
      : [];
    const persistedDocuments = requestedTools.has('documents')
      ? await this.getDocuments(userId, { payrollCycle, documentId })
      : [];
    const documents = [...persistedDocuments, ...(uploadedDocument ? [uploadedDocument] : [])];
    const ytd = requestedTools.has('ytd')
      ? await payrollRepository.findByUserAndFy(userId, fy)
      : [];
    const policies = requestedTools.has('policy')
      ? companyPolicyService.search(policyQuery).map(({ policyId, title, category, effectiveFrom, version, source, content }) => ({
        policyId, title, category, effectiveFrom, version, source, content
      }))
      : [];

    if (documents.length) {
      logger.info('User action audited: payslip_access', {
        userId,
        action: 'payslip_access',
        intent: 'DOCUMENT_GROUNDED',
        query: null,
        details: {
          documentIds: documents.map((document) => document.documentId).filter(Boolean),
          categories: documents.map((document) => document.category)
        }
      });
    }
    if (deductions.length) {
      logger.info('User action audited: deduction_access', {
        userId,
        action: 'deduction_access',
        intent: 'DEDUCTION_BREAKDOWN',
        query: null,
        details: {
          typeCodes: deductions.map((deduction) => deduction.typeCode),
          financialYear: fy
        }
      });
    }
    if (reimbursements.length) {
      logger.info('User action audited: reimbursement_access', {
        userId,
        action: 'reimbursement_access',
        intent: 'REIMBURSEMENT_BREAKDOWN',
        query: null,
        details: {
          typeCodes: reimbursements.map((claim) => claim.typeCode),
          financialYear: fy
        }
      });
    }
    if (payroll || payrollComparison.length || ytd.length) {
      logger.info('User action audited: payroll_access', {
        userId,
        action: 'payroll_access',
        intent: 'SALARY_EXPLAIN',
        query: null,
        details: {
          hasPayroll: Boolean(payroll),
          comparisonCycles: payrollComparison.map((row) => row.payrollCycle),
          ytdCycleCount: ytd.length,
          financialYear: fy
        }
      });
    }

    return {
      employeeId: user.userId,
      financialYear: fy,
      userProfile: requestedTools.has('profile') || requestedTools.has('taxSimulation') ? user.getEligibilityContext() : null,
      payroll: payroll ? this.formatPayroll(payroll) : null,
      payrollComparison: payrollComparison.map((row) => this.formatPayroll(row)),
      deductions: await Promise.all(deductions.map(async (row) => {
        const catalog = await deductionTypeCatalogRepository.findByCode(row.typeCode);
        return {
          ...this.formatMoneyRow(row),
          displayName: catalog?.displayName ?? row.typeCode,
          description: catalog?.description ?? null,
          requiresProof: catalog?.requiresProof ?? false,
          proofDocumentCategory: catalog?.proofDocumentCategory ?? null
        };
      })),
      reimbursements: reimbursements.map((row) => this.formatMoneyRow(row)),
      ytd: ytd.map((row) => this.formatPayroll(row)),
      companyPolicies: policies,
      documents: documents.map((document) => ({
        documentId: document.documentId,
        category: document.category,
        financialYear: document.financialYear,
        payrollCycle: document.payrollCycle,
        fields: document.mockOcrPayload?.fields ?? document.mockOcrPayload?.extractedData ?? {},
        ocrText: document.mockOcrPayload?.rawText ?? document.mockOcrPayload?.text ?? null
      }))
    };
  }

  async getPayrollComparison(userId, financialYear, payrollCycle) {
    const rows = await payrollRepository.findByUserAndFy(userId, financialYear);
    const ordered = rows.sort((left, right) => left.payrollCycle.localeCompare(right.payrollCycle));
    if (!payrollCycle) return ordered.slice(-2);
    const currentIndex = ordered.findIndex((row) => row.payrollCycle === payrollCycle);
    return currentIndex < 0 ? ordered.slice(-2) : ordered.slice(Math.max(0, currentIndex - 1), currentIndex + 1);
  }

  async getDocuments(userId, { payrollCycle, documentId } = {}) {
    if (documentId) {
      const document = await userDocumentRepository.findByUserAndId(userId, documentId);
      return document?.status === 'OCR_COMPLETE' ? [document] : [];
    }
    const where = { status: 'OCR_COMPLETE' };
    if (payrollCycle) where.payrollCycle = payrollCycle;
    return userDocumentRepository.find(userId, where);
  }

  formatPayroll(payroll) {
    return {
      payrollCycle: payroll.payrollCycle,
      financialYear: payroll.financialYear,
      basic: fromMinorUnits(payroll.basicMinor),
      hra: fromMinorUnits(payroll.hraMinor),
      lta: fromMinorUnits(payroll.ltaMinor),
      specialAllowance: fromMinorUnits(payroll.specialAllowanceMinor),
      grossPay: fromMinorUnits(payroll.grossPayMinor),
      totalPayrollDeductions: fromMinorUnits(payroll.totalPayrollDeductionsMinor),
      netPay: fromMinorUnits(payroll.netPayMinor),
      otherAllowances: payroll.otherAllowances,
      ytdSnapshot: payroll.ytdSnapshot
    };
  }

  formatMoneyRow(row) {
    const { amountMinor, ...safeRow } = row;
    return { ...safeRow, amount: fromMinorUnits(amountMinor) };
  }
}

export const contextAssembler = new ContextAssembler();
