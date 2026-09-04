/**
 * Prototype seed: catalogs + demo employee + two payroll cycles.
 * In-memory SQLite is empty after every process start.
 */
import { getModels } from '../models/index.js';
import { deductionTypeFixtures } from '../fixtures/policy/deductionTypes.js';
import { reimbursementTypeFixtures } from '../fixtures/policy/reimbursementTypes.js';
import { logger } from '../config/logger.js';

const DEMO_USER_ID = 'emp_101';

/**
 * Inserts fixtures if the users table is empty.
 */
export async function seedDatabase() {
  const { User, DeductionTypeCatalog, ReimbursementTypeCatalog, PayrollRecord, Deduction } =
    getModels();

  const existing = await User.count();
  if (existing > 0) {
    return;
  }

  await DeductionTypeCatalog.bulkCreate(deductionTypeFixtures);
  await ReimbursementTypeCatalog.bulkCreate(reimbursementTypeFixtures);

  await User.create({
    userId: DEMO_USER_ID,
    name: 'Jane Doe',
    email: 'jane@company.com',
    employeeCode: 'EMP101',
    department: 'Engineering',
    designation: 'Senior Software Engineer',
    rank: 'L5',
    employeeType: 'FULL_TIME',
    location: 'Bengaluru',
    dateOfJoining: '2022-06-01',
    employmentStartDate: '2022-06-01',
    employmentStatus: 'ACTIVE',
    taxRegime: 'OLD',
    taxRegimeLocked: false,
    activeFinancialYear: '2026-2027',
    demoPassword: 'demo',
    createdBy: 'system',
    updatedBy: 'system'
  });

  const ytdApr = {
    grossMinor: 15000000,
    netMinor: 11860000,
    byDeductionType: {
      PF_EMPLOYEE: { totalMinor: 1800000, display: '18000.00', label: 'Employee Provident Fund' },
      TDS: { totalMinor: 1250000, display: '12500.00', label: 'Income Tax (TDS)' },
      PROFESSIONAL_TAX: { totalMinor: 20000, display: '200.00', label: 'Professional Tax' }
    },
    taxDeclarationTotals: {}
  };

  await PayrollRecord.create({
    recordId: 'pr_2026_03',
    userId: DEMO_USER_ID,
    payrollCycle: '2026-03',
    financialYear: '2025-2026',
    basicMinor: 7500000,
    hraMinor: 3000000,
    ltaMinor: 0,
    specialAllowanceMinor: 1500000,
    otherAllowances: { fuelAllowance: 500000 },
    grossPayMinor: 12500000,
    totalPayrollDeductionsMinor: 2800000,
    netPayMinor: 9700000,
    ytdSnapshot: ytdApr,
    createdBy: 'system',
    updatedBy: 'system'
  });

  await PayrollRecord.create({
    recordId: 'pr_2026_04',
    userId: DEMO_USER_ID,
    payrollCycle: '2026-04',
    financialYear: '2026-2027',
    basicMinor: 7500000,
    hraMinor: 3000000,
    ltaMinor: 0,
    specialAllowanceMinor: 1500000,
    otherAllowances: { fuelAllowance: 3000000 },
    grossPayMinor: 15000000,
    totalPayrollDeductionsMinor: 3140000,
    netPayMinor: 11860000,
    ytdSnapshot: ytdApr,
    createdBy: 'system',
    updatedBy: 'system'
  });

  const payrollRows = [
    {
      deductionId: 'ded_pf_03',
      cycle: '2026-03',
      fy: '2025-2026',
      typeCode: 'PF_EMPLOYEE',
      amount: 1800000
    },
    {
      deductionId: 'ded_tds_03',
      cycle: '2026-03',
      fy: '2025-2026',
      typeCode: 'TDS',
      amount: 980000
    },
    {
      deductionId: 'ded_pt_03',
      cycle: '2026-03',
      fy: '2025-2026',
      typeCode: 'PROFESSIONAL_TAX',
      amount: 20000
    },
    {
      deductionId: 'ded_pf_04',
      cycle: '2026-04',
      fy: '2026-2027',
      typeCode: 'PF_EMPLOYEE',
      amount: 1800000
    },
    {
      deductionId: 'ded_tds_04',
      cycle: '2026-04',
      fy: '2026-2027',
      typeCode: 'TDS',
      amount: 1320000
    },
    {
      deductionId: 'ded_pt_04',
      cycle: '2026-04',
      fy: '2026-2027',
      typeCode: 'PROFESSIONAL_TAX',
      amount: 20000
    }
  ];

  for (const row of payrollRows) {
    await Deduction.create({
      deductionId: row.deductionId,
      userId: DEMO_USER_ID,
      typeCode: row.typeCode,
      scope: 'PAYROLL',
      amountMinor: row.amount,
      payrollCycle: row.cycle,
      financialYear: row.fy,
      declaredUnderRegime: 'OLD',
      isValidUnderPolicy: true,
      validationMessages: [],
      policyVersionAtCreation: 'FY2026-v1',
      status: 'APPLIED',
      source: 'PAYROLL_IMPORT',
      createdBy: 'system',
      updatedBy: 'system'
    });
  }

  await Deduction.create({
    deductionId: 'ded_elss_decl',
    userId: DEMO_USER_ID,
    typeCode: '80C_ELSS',
    scope: 'TAX_DECLARATION',
    amountMinor: 10000000,
    payrollCycle: null,
    financialYear: '2026-2027',
    declaredUnderRegime: 'OLD',
    isValidUnderPolicy: true,
    validationMessages: [],
    policyVersionAtCreation: 'FY2026-OLD-v1',
    status: 'DECLARED',
    source: 'EMPLOYEE',
    createdBy: DEMO_USER_ID,
    updatedBy: DEMO_USER_ID
  });

  logger.info('Prototype database seeded', { userId: DEMO_USER_ID });
}
