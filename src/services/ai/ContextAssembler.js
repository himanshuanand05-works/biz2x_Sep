import { User } from '../../domain/User.js';
import { userRepository } from '../../repositories/UserRepository.js';
import { payrollRepository } from '../../repositories/PayrollRepository.js';
import { deductionRepository } from '../../repositories/DeductionRepository.js';
import { reimbursementRepository } from '../../repositories/ReimbursementRepository.js';
import { userDocumentRepository } from '../../repositories/UserDocumentRepository.js';
import { fromMinorUnits } from '../../utils/money.js';
import { NotFoundError } from '../../utils/errors.js';

/** Builds a read-only, employee-scoped context for the grounded prompt. */
export class ContextAssembler {
  async assemble(userId, { payrollCycle, financialYear } = {}) {
    const userRow = await userRepository.findById(userId);
    if (!userRow) throw new NotFoundError('User not found');
    const user = new User(userRow);
    const fy = financialYear ?? user.activeFinancialYear;
    const payroll = payrollCycle
      ? await payrollRepository.findByUserAndCycle(userId, payrollCycle)
      : await payrollRepository.findLatestCycle(userId);
    const deductions = await deductionRepository.findByUserAndFY(userId, fy);
    const reimbursements = await reimbursementRepository.find(userId, { financialYear: fy });
    const documents = await userDocumentRepository.find(userId, { status: 'OCR_COMPLETE' });

    return {
      employeeId: user.userId,
      userProfile: user.getEligibilityContext(),
      payroll: payroll ? this.formatPayroll(payroll) : null,
      deductions: deductions.map((row) => this.formatMoneyRow(row)),
      reimbursements: reimbursements.map((row) => this.formatMoneyRow(row)),
      documents: documents.map((document) => ({
        documentId: document.documentId,
        category: document.category,
        financialYear: document.financialYear,
        payrollCycle: document.payrollCycle,
        ocrText: document.mockOcrPayload?.rawText ?? document.mockOcrPayload?.text ?? null
      }))
    };
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
