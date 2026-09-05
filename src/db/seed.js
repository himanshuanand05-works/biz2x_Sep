/**
 * Prototype seed: catalogs + demo employee + two payroll cycles.
 * In-memory SQLite is empty after every process start.
 */
import { getModels } from '../models/index.js';
import { deductionTypeFixtures } from '../fixtures/policy/deductionTypes.js';
import { reimbursementTypeFixtures } from '../fixtures/policy/reimbursementTypes.js';
import { ocrFixtures } from '../fixtures/ocr/index.js';
import { logger } from '../config/logger.js';
import { hashPassword } from '../utils/password.js';

const DEMO_USER_ID = 'emp_101';
const DEMO_PASSWORD_HASH = hashPassword('demo');

function ytdSnapshot(grossMinor, netMinor, deductions, taxDeclarationTotals = {}) {
  return {
    grossMinor,
    netMinor,
    byDeductionType: Object.fromEntries(
      deductions.map(({ typeCode, totalMinor, display, label }) => [typeCode, { totalMinor, display, label }])
    ),
    taxDeclarationTotals
  };
}

function payrollRecord({
  recordId,
  userId,
  payrollCycle,
  financialYear,
  basicMinor,
  hraMinor,
  ltaMinor = 0,
  specialAllowanceMinor = 0,
  otherAllowances = {},
  grossPayMinor,
  totalPayrollDeductionsMinor,
  netPayMinor,
  ytd,
  createdBy = 'system'
}) {
  return {
    recordId,
    userId,
    payrollCycle,
    financialYear,
    basicMinor,
    hraMinor,
    ltaMinor,
    specialAllowanceMinor,
    otherAllowances,
    grossPayMinor,
    totalPayrollDeductionsMinor,
    netPayMinor,
    ytdSnapshot: ytd,
    createdBy,
    updatedBy: createdBy
  };
}

function payrollDeduction({ deductionId, userId, cycle, fy, typeCode, amount, declaredUnderRegime = 'OLD' }) {
  return {
    deductionId,
    userId,
    typeCode,
    scope: 'PAYROLL',
    amountMinor: amount,
    payrollCycle: cycle,
    financialYear: fy,
    declaredUnderRegime,
    isValidUnderPolicy: true,
    validationMessages: [],
    policyVersionAtCreation: 'FY2026-v1',
    status: 'APPLIED',
    source: 'PAYROLL_IMPORT',
    createdBy: 'system',
    updatedBy: 'system'
  };
}

function documentRecord({
  documentId,
  userId,
  category,
  fileName,
  linkedEntityType = null,
  linkedEntityId = null,
  financialYear = null,
  payrollCycle = null,
  status = 'OCR_COMPLETE',
  mockOcrPayload = ocrFixtures[category] ?? ocrFixtures.OTHER
}) {
  return {
    documentId,
    userId,
    category,
    fileName,
    mimeType: 'application/pdf',
    fileSizeBytes: 128000,
    status,
    mockOcrPayload,
    linkedEntityType,
    linkedEntityId,
    financialYear,
    payrollCycle,
    createdBy: userId,
    updatedBy: userId
  };
}

function reimbursementRecord({
  reimbursementId,
  userId,
  typeCode,
  claimDate,
  payrollCycle,
  financialYear,
  amountMinor,
  description,
  status,
  proofDocumentId = null,
  isEligible = true,
  isValidUnderPolicy = true,
  validationMessages = [],
  isApproved = false,
  approvedAmountMinor = null,
  rejectionReason = null,
  paidAt = null
}) {
  return {
    reimbursementId,
    userId,
    typeCode,
    claimDate,
    payrollCycle,
    financialYear,
    amountMinor,
    description,
    isEligible,
    isValidUnderPolicy,
    validationMessages,
    policyVersionAtCreation: 'FY2026-v1',
    isApproved,
    status,
    proofDocumentId,
    approvedAmountMinor,
    approvedBy: isApproved ? 'hr_001' : null,
    approvedAt: isApproved ? '2026-05-20T10:00:00.000Z' : null,
    rejectionReason,
    paidAt,
    createdBy: userId,
    updatedBy: userId
  };
}

/**
 * Inserts fixtures if the users table is empty.
 */
export async function seedDatabase() {
  const { User, UserDocument, DeductionTypeCatalog, ReimbursementTypeCatalog, PayrollRecord, Deduction, Reimbursement } =
    getModels();

  const existing = await User.count();
  if (existing > 0) {
    return;
  }

  await DeductionTypeCatalog.bulkCreate(deductionTypeFixtures);
  await ReimbursementTypeCatalog.bulkCreate(reimbursementTypeFixtures);

  await User.bulkCreate([{
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
    passwordHash: DEMO_PASSWORD_HASH,
    createdBy: 'system',
    updatedBy: 'system'
  }, {
    userId: 'emp_102',
    name: 'Arjun Rao',
    email: 'arjun@company.com',
    employeeCode: 'EMP102',
    department: 'Customer Operations',
    designation: 'Operations Associate',
    rank: 'L3',
    employeeType: 'CONTRACT',
    location: 'Hyderabad',
    dateOfJoining: '2026-01-15',
    employmentStartDate: '2026-01-15',
    probationEndDate: '2026-07-15',
    employmentStatus: 'PROBATION',
    taxRegime: 'OLD',
    taxRegimeLocked: false,
    passwordHash: DEMO_PASSWORD_HASH,
    createdBy: 'system',
    updatedBy: 'system'
  }, {
    userId: 'emp_103',
    name: 'Meera Shah',
    email: 'meera@company.com',
    employeeCode: 'EMP103',
    department: 'Product',
    designation: 'Product Manager',
    rank: 'M2',
    employeeType: 'FULL_TIME',
    location: 'Pune',
    dateOfJoining: '2020-08-10',
    employmentStartDate: '2020-08-10',
    employmentStatus: 'ACTIVE',
    taxRegime: 'NEW',
    taxRegimeLocked: true,
    passwordHash: DEMO_PASSWORD_HASH,
    createdBy: 'system',
    updatedBy: 'system'
  }, {
    userId: 'emp_104',
    name: 'Kabir Singh',
    email: 'kabir@company.com',
    employeeCode: 'EMP104',
    department: 'Engineering',
    designation: 'Software Engineer',
    rank: 'L4',
    employeeType: 'FULL_TIME',
    location: 'Delhi',
    dateOfJoining: '2023-02-20',
    employmentStartDate: '2023-02-20',
    employmentStatus: 'NOTICE_PERIOD',
    noticePeriodEndDate: '2026-06-30',
    taxRegime: 'OLD',
    taxRegimeLocked: true,
    passwordHash: DEMO_PASSWORD_HASH,
    createdBy: 'system',
    updatedBy: 'system'
  }, {
    userId: 'emp_105',
    name: 'Nisha Patel',
    email: 'nisha@company.com',
    employeeCode: 'EMP105',
    department: 'Design',
    designation: 'Design Intern',
    rank: 'L1',
    employeeType: 'INTERN',
    location: 'Mumbai',
    dateOfJoining: '2026-05-01',
    employmentStartDate: '2026-05-01',
    employmentStatus: 'ACTIVE',
    taxRegime: 'NEW',
    taxRegimeLocked: false,
    passwordHash: DEMO_PASSWORD_HASH,
    createdBy: 'system',
    updatedBy: 'system'
  }, {
    userId: 'emp_106',
    name: 'Rohan Mehta',
    email: 'rohan@company.com',
    employeeCode: 'EMP106',
    department: 'Finance',
    designation: 'Finance Analyst',
    rank: 'L4',
    employeeType: 'FULL_TIME',
    location: 'Chennai',
    dateOfJoining: '2021-11-15',
    employmentStartDate: '2021-11-15',
    employmentStatus: 'ON_LEAVE',
    taxRegime: 'OLD',
    taxRegimeLocked: false,
    passwordHash: DEMO_PASSWORD_HASH,
    createdBy: 'system',
    updatedBy: 'system'
  }, {
    userId: 'emp_107',
    name: 'Sana Khan',
    email: 'sana@company.com',
    employeeCode: 'EMP107',
    department: 'Sales',
    designation: 'Account Executive',
    rank: 'L3',
    employeeType: 'FULL_TIME',
    location: 'Kolkata',
    dateOfJoining: '2019-04-08',
    employmentStartDate: '2019-04-08',
    employmentStatus: 'EXITED',
    exitDate: '2026-04-30',
    taxRegime: 'OLD',
    taxRegimeLocked: true,
    passwordHash: DEMO_PASSWORD_HASH,
    createdBy: 'system',
    updatedBy: 'system'
  }]);

  await PayrollRecord.bulkCreate([
    payrollRecord({
      recordId: 'pr_2026_03', userId: DEMO_USER_ID, payrollCycle: '2026-03', financialYear: '2025-2026',
      basicMinor: 7500000, hraMinor: 3000000, specialAllowanceMinor: 1500000,
      otherAllowances: { fuelAllowance: 500000 }, grossPayMinor: 12500000,
      totalPayrollDeductionsMinor: 2800000, netPayMinor: 9700000,
      ytd: ytdSnapshot(12500000, 9700000, [
        { typeCode: 'PF_EMPLOYEE', totalMinor: 1800000, display: '18000.00', label: 'Employee Provident Fund' },
        { typeCode: 'TDS', totalMinor: 980000, display: '9800.00', label: 'Income Tax (TDS)' },
        { typeCode: 'PROFESSIONAL_TAX', totalMinor: 20000, display: '200.00', label: 'Professional Tax' }
      ])
    }),
    payrollRecord({
      recordId: 'pr_2026_04', userId: DEMO_USER_ID, payrollCycle: '2026-04', financialYear: '2026-2027',
      basicMinor: 7500000, hraMinor: 3000000, specialAllowanceMinor: 1500000,
      otherAllowances: { fuelAllowance: 3000000 }, grossPayMinor: 15000000,
      totalPayrollDeductionsMinor: 3140000, netPayMinor: 11860000,
      ytd: ytdSnapshot(15000000, 11860000, [
        { typeCode: 'PF_EMPLOYEE', totalMinor: 1800000, display: '18000.00', label: 'Employee Provident Fund' },
        { typeCode: 'TDS', totalMinor: 1320000, display: '13200.00', label: 'Income Tax (TDS)' },
        { typeCode: 'PROFESSIONAL_TAX', totalMinor: 20000, display: '200.00', label: 'Professional Tax' }
      ])
    }),
    payrollRecord({
      recordId: 'pr_2026_05', userId: DEMO_USER_ID, payrollCycle: '2026-05', financialYear: '2026-2027',
      basicMinor: 7500000, hraMinor: 3000000, specialAllowanceMinor: 1500000,
      otherAllowances: { fuelAllowance: 3000000 }, grossPayMinor: 15000000,
      totalPayrollDeductionsMinor: 3140000, netPayMinor: 11860000,
      ytd: ytdSnapshot(30000000, 23720000, [
        { typeCode: 'PF_EMPLOYEE', totalMinor: 3600000, display: '36000.00', label: 'Employee Provident Fund' },
        { typeCode: 'TDS', totalMinor: 2640000, display: '26400.00', label: 'Income Tax (TDS)' },
        { typeCode: 'PROFESSIONAL_TAX', totalMinor: 40000, display: '400.00', label: 'Professional Tax' }
      ], { '80C': { declaredMinor: 10000000, eligibleMinor: 10000000, limitMinor: 15000000 } })
    }),
    payrollRecord({
      recordId: 'pr_102_04', userId: 'emp_102', payrollCycle: '2026-04', financialYear: '2026-2027',
      basicMinor: 3500000, hraMinor: 1000000, specialAllowanceMinor: 250000,
      grossPayMinor: 4750000, totalPayrollDeductionsMinor: 620000, netPayMinor: 4130000,
      ytd: ytdSnapshot(4750000, 4130000, [
        { typeCode: 'PF_EMPLOYEE', totalMinor: 570000, display: '5700.00', label: 'Employee Provident Fund' },
        { typeCode: 'PROFESSIONAL_TAX', totalMinor: 20000, display: '200.00', label: 'Professional Tax' },
        { typeCode: 'TDS', totalMinor: 30000, display: '300.00', label: 'Income Tax (TDS)' }
      ])
    }),
    payrollRecord({
      recordId: 'pr_103_04', userId: 'emp_103', payrollCycle: '2026-04', financialYear: '2026-2027',
      basicMinor: 11000000, hraMinor: 4500000, specialAllowanceMinor: 2500000,
      grossPayMinor: 18000000, totalPayrollDeductionsMinor: 3820000, netPayMinor: 14180000,
      ytd: ytdSnapshot(18000000, 14180000, [
        { typeCode: 'PF_EMPLOYEE', totalMinor: 2160000, display: '21600.00', label: 'Employee Provident Fund' },
        { typeCode: 'TDS', totalMinor: 1640000, display: '16400.00', label: 'Income Tax (TDS)' },
        { typeCode: 'PROFESSIONAL_TAX', totalMinor: 20000, display: '200.00', label: 'Professional Tax' }
      ])
    }),
    payrollRecord({
      recordId: 'pr_104_05', userId: 'emp_104', payrollCycle: '2026-05', financialYear: '2026-2027',
      basicMinor: 6000000, hraMinor: 2400000, specialAllowanceMinor: 600000,
      grossPayMinor: 9000000, totalPayrollDeductionsMinor: 1900000, netPayMinor: 7100000,
      ytd: ytdSnapshot(9000000, 7100000, [
        { typeCode: 'PF_EMPLOYEE', totalMinor: 1200000, display: '12000.00', label: 'Employee Provident Fund' },
        { typeCode: 'TDS', totalMinor: 680000, display: '6800.00', label: 'Income Tax (TDS)' },
        { typeCode: 'PROFESSIONAL_TAX', totalMinor: 20000, display: '200.00', label: 'Professional Tax' }
      ])
    }),
    payrollRecord({
      recordId: 'pr_105_05', userId: 'emp_105', payrollCycle: '2026-05', financialYear: '2026-2027',
      basicMinor: 1800000, hraMinor: 0, specialAllowanceMinor: 200000,
      otherAllowances: {}, grossPayMinor: 2000000, totalPayrollDeductionsMinor: 0, netPayMinor: 2000000,
      ytd: ytdSnapshot(2000000, 2000000, [])
    }),
    payrollRecord({
      recordId: 'pr_106_03', userId: 'emp_106', payrollCycle: '2026-03', financialYear: '2025-2026',
      basicMinor: 6500000, hraMinor: 2600000, specialAllowanceMinor: 900000,
      otherAllowances: {}, grossPayMinor: 10000000, totalPayrollDeductionsMinor: 2200000, netPayMinor: 7800000,
      ytd: ytdSnapshot(10000000, 7800000, [
        { typeCode: 'PF_EMPLOYEE', totalMinor: 1300000, display: '13000.00', label: 'Employee Provident Fund' },
        { typeCode: 'TDS', totalMinor: 880000, display: '8800.00', label: 'Income Tax (TDS)' },
        { typeCode: 'PROFESSIONAL_TAX', totalMinor: 20000, display: '200.00', label: 'Professional Tax' }
      ])
    }),
    payrollRecord({
      recordId: 'pr_107_04', userId: 'emp_107', payrollCycle: '2026-04', financialYear: '2026-2027',
      basicMinor: 5000000, hraMinor: 2000000, specialAllowanceMinor: 500000,
      otherAllowances: { salesIncentive: 1000000 }, grossPayMinor: 8500000,
      totalPayrollDeductionsMinor: 1700000, netPayMinor: 6800000,
      ytd: ytdSnapshot(8500000, 6800000, [
        { typeCode: 'PF_EMPLOYEE', totalMinor: 1000000, display: '10000.00', label: 'Employee Provident Fund' },
        { typeCode: 'TDS', totalMinor: 680000, display: '6800.00', label: 'Income Tax (TDS)' },
        { typeCode: 'PROFESSIONAL_TAX', totalMinor: 20000, display: '200.00', label: 'Professional Tax' }
      ])
    })
  ]);

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
    await Deduction.create(payrollDeduction({
      ...row,
      userId: DEMO_USER_ID,
      cycle: row.cycle,
      fy: row.fy,
      amount: row.amount
    }));
  }

  await Deduction.bulkCreate([
    payrollDeduction({ deductionId: 'ded_102_pf_04', userId: 'emp_102', cycle: '2026-04', fy: '2026-2027', typeCode: 'PF_EMPLOYEE', amount: 570000 }),
    payrollDeduction({ deductionId: 'ded_102_pt_04', userId: 'emp_102', cycle: '2026-04', fy: '2026-2027', typeCode: 'PROFESSIONAL_TAX', amount: 20000 }),
    payrollDeduction({ deductionId: 'ded_102_tds_04', userId: 'emp_102', cycle: '2026-04', fy: '2026-2027', typeCode: 'TDS', amount: 30000 }),
    payrollDeduction({ deductionId: 'ded_103_pf_04', userId: 'emp_103', cycle: '2026-04', fy: '2026-2027', typeCode: 'PF_EMPLOYEE', amount: 2160000 }),
    payrollDeduction({ deductionId: 'ded_103_tds_04', userId: 'emp_103', cycle: '2026-04', fy: '2026-2027', typeCode: 'TDS', amount: 1640000, declaredUnderRegime: 'NEW' }),
    payrollDeduction({ deductionId: 'ded_103_pt_04', userId: 'emp_103', cycle: '2026-04', fy: '2026-2027', typeCode: 'PROFESSIONAL_TAX', amount: 20000, declaredUnderRegime: 'NEW' }),
    payrollDeduction({ deductionId: 'ded_104_pf_05', userId: 'emp_104', cycle: '2026-05', fy: '2026-2027', typeCode: 'PF_EMPLOYEE', amount: 1200000 }),
    payrollDeduction({ deductionId: 'ded_104_tds_05', userId: 'emp_104', cycle: '2026-05', fy: '2026-2027', typeCode: 'TDS', amount: 680000 }),
    payrollDeduction({ deductionId: 'ded_104_pt_05', userId: 'emp_104', cycle: '2026-05', fy: '2026-2027', typeCode: 'PROFESSIONAL_TAX', amount: 20000 })
    , payrollDeduction({ deductionId: 'ded_106_pf_03', userId: 'emp_106', cycle: '2026-03', fy: '2025-2026', typeCode: 'PF_EMPLOYEE', amount: 1300000 })
    , payrollDeduction({ deductionId: 'ded_106_tds_03', userId: 'emp_106', cycle: '2026-03', fy: '2025-2026', typeCode: 'TDS', amount: 880000 })
    , payrollDeduction({ deductionId: 'ded_106_pt_03', userId: 'emp_106', cycle: '2026-03', fy: '2025-2026', typeCode: 'PROFESSIONAL_TAX', amount: 20000 })
    , payrollDeduction({ deductionId: 'ded_107_pf_04', userId: 'emp_107', cycle: '2026-04', fy: '2026-2027', typeCode: 'PF_EMPLOYEE', amount: 1000000 })
    , payrollDeduction({ deductionId: 'ded_107_tds_04', userId: 'emp_107', cycle: '2026-04', fy: '2026-2027', typeCode: 'TDS', amount: 680000 })
    , payrollDeduction({ deductionId: 'ded_107_pt_04', userId: 'emp_107', cycle: '2026-04', fy: '2026-2027', typeCode: 'PROFESSIONAL_TAX', amount: 20000 })
  ]);

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

  await UserDocument.bulkCreate([
    documentRecord({
      documentId: 'doc_101_payslip_04', userId: DEMO_USER_ID, category: 'PAYSLIP',
      fileName: 'jane-doe-april-2026-payslip.pdf', linkedEntityType: 'PAYROLL_CYCLE',
      linkedEntityId: '2026-04', financialYear: '2026-2027', payrollCycle: '2026-04'
    }),
    documentRecord({
      documentId: 'doc_101_payslip_missing_05', userId: DEMO_USER_ID, category: 'PAYSLIP',
      fileName: 'jane-doe-may-2026-incomplete-payslip.pdf', linkedEntityType: 'PAYROLL_CYCLE',
      linkedEntityId: '2026-05', financialYear: '2026-2027', payrollCycle: '2026-05',
      mockOcrPayload: {
        fields: {
          employeeName: 'Jane Doe', employeeCode: 'EMP101', payrollCycle: '2026-05',
          basic: '75000.00', grossPay: '150000.00'
        },
        rawText: 'PAYSLIP FOR MAY 2026\nEmployee: Jane Doe\nGross: 150000.00\nHRA: [MISSING]\nNet pay: [MISSING]'
      }
    }),
    documentRecord({
      documentId: 'doc_101_payslip_inconsistent_06', userId: DEMO_USER_ID, category: 'PAYSLIP',
      fileName: 'jane-doe-june-2026-inconsistent-payslip.pdf', linkedEntityType: 'PAYROLL_CYCLE',
      linkedEntityId: '2026-06', financialYear: '2026-2027', payrollCycle: '2026-06',
      mockOcrPayload: {
        fields: {
          employeeName: 'Jane Doe', employeeCode: 'EMP101', payrollCycle: '2026-06',
          basic: '75000.00', hra: '30000.00', specialAllowance: '15000.00',
          grossPay: '160000.00', providentFund: '9000.00', professionalTax: '200.00',
          incomeTaxTds: '22200.00', netPay: '140000.00'
        },
        rawText: 'PAYSLIP FOR JUNE 2026\nBasic: 75000.00\nHRA: 30000.00\nSpecial allowance: 15000.00\nGross: 160000.00\nNet: 140000.00'
      }
    }),
    documentRecord({
      documentId: 'doc_101_tax_elss', userId: DEMO_USER_ID, category: 'TAX_PROOF',
      fileName: 'jane-doe-elss-proof.pdf', linkedEntityType: 'DEDUCTION',
      linkedEntityId: 'ded_elss_decl', financialYear: '2026-2027'
    }),
    documentRecord({
      documentId: 'doc_101_medical', userId: DEMO_USER_ID, category: 'REIMBURSEMENT_PROOF',
      fileName: 'jane-doe-clinic-invoice.pdf', linkedEntityType: 'REIMBURSEMENT',
      linkedEntityId: 'rmb_101_medical', financialYear: '2026-2027', payrollCycle: '2026-04'
    }),
    documentRecord({
      documentId: 'doc_102_previous_employer', userId: 'emp_102', category: 'PREVIOUS_EMPLOYER',
      fileName: 'arjun-previous-employer-form16.pdf', financialYear: '2026-2027'
    }),
    documentRecord({
      documentId: 'doc_103_declaration', userId: 'emp_103', category: 'DECLARATION',
      fileName: 'meera-new-regime-declaration.pdf', financialYear: '2026-2027'
    }),
    documentRecord({
      documentId: 'doc_104_other', userId: 'emp_104', category: 'OTHER',
      fileName: 'kabir-exit-clearance.pdf', status: 'UPLOADED'
    }),
    documentRecord({
      documentId: 'doc_105_declaration', userId: 'emp_105', category: 'DECLARATION',
      fileName: 'nisha-intern-declaration.pdf', financialYear: '2026-2027'
    }),
    documentRecord({
      documentId: 'doc_106_medical', userId: 'emp_106', category: 'REIMBURSEMENT_PROOF',
      fileName: 'rohan-medical-proof.pdf', financialYear: '2025-2026', payrollCycle: '2026-03'
    }),
    documentRecord({
      documentId: 'doc_107_form16', userId: 'emp_107', category: 'PREVIOUS_EMPLOYER',
      fileName: 'sana-form16.pdf', financialYear: '2025-2026'
    })
  ]);

  await Reimbursement.bulkCreate([
    reimbursementRecord({
      reimbursementId: 'rmb_101_medical', userId: DEMO_USER_ID, typeCode: 'MEDICAL',
      claimDate: '2026-04-12', payrollCycle: '2026-04', financialYear: '2026-2027',
      amountMinor: 250000, description: 'Outpatient consultation and medicines', status: 'PAID',
      proofDocumentId: 'doc_101_medical', isApproved: true, approvedAmountMinor: 250000,
      paidAt: '2026-05-31T10:00:00.000Z'
    }),
    reimbursementRecord({
      reimbursementId: 'rmb_101_internet', userId: DEMO_USER_ID, typeCode: 'INTERNET',
      claimDate: '2026-05-05', payrollCycle: '2026-05', financialYear: '2026-2027',
      amountMinor: 120000, description: 'May home internet bill', status: 'SUBMITTED'
    }),
    reimbursementRecord({
      reimbursementId: 'rmb_102_medical', userId: 'emp_102', typeCode: 'MEDICAL',
      claimDate: '2026-04-22', payrollCycle: '2026-04', financialYear: '2026-2027',
      amountMinor: 180000, description: 'Clinic visit during probation', status: 'DRAFT'
    }),
    reimbursementRecord({
      reimbursementId: 'rmb_103_internet', userId: 'emp_103', typeCode: 'INTERNET',
      claimDate: '2026-04-30', payrollCycle: '2026-04', financialYear: '2026-2027',
      amountMinor: 150000, description: 'April home internet bill', status: 'APPROVED',
      isApproved: true, approvedAmountMinor: 150000
    }),
    reimbursementRecord({
      reimbursementId: 'rmb_104_lta', userId: 'emp_104', typeCode: 'LTA',
      claimDate: '2026-05-15', payrollCycle: '2026-05', financialYear: '2026-2027',
      amountMinor: 300000, description: 'Travel claim after notice period began', status: 'REJECTED',
      rejectionReason: 'LTA claim is not payable during notice period.'
    }),
    reimbursementRecord({
      reimbursementId: 'rmb_105_internet', userId: 'emp_105', typeCode: 'INTERNET',
      claimDate: '2026-05-20', payrollCycle: '2026-05', financialYear: '2026-2027',
      amountMinor: 80000, description: 'Intern connectivity claim', status: 'REJECTED',
      isEligible: false, isValidUnderPolicy: false,
      validationMessages: ['Employee type INTERN is not eligible for this reimbursement.'],
      rejectionReason: 'Interns are not eligible for internet reimbursement.'
    }),
    reimbursementRecord({
      reimbursementId: 'rmb_106_medical', userId: 'emp_106', typeCode: 'MEDICAL',
      claimDate: '2026-03-10', payrollCycle: '2026-03', financialYear: '2025-2026',
      amountMinor: 400000, description: 'Medical claim during leave', status: 'UNDER_REVIEW',
      proofDocumentId: 'doc_106_medical'
    }),
    reimbursementRecord({
      reimbursementId: 'rmb_107_medical', userId: 'emp_107', typeCode: 'MEDICAL',
      claimDate: '2026-04-10', payrollCycle: '2026-04', financialYear: '2026-2027',
      amountMinor: 300000, description: 'Exit-period medical claim', status: 'CANCELLED',
      isEligible: false, isValidUnderPolicy: false,
      validationMessages: ['Employee is no longer active.'],
      rejectionReason: 'Claim cancelled after employment ended.'
    })
  ]);

  logger.info('Prototype database seeded', { userId: DEMO_USER_ID });
}
