/** Canned OCR payloads keyed by document category. */
export const ocrFixtures = {
  PAYSLIP: {
    fields: {
      employeeName: 'Jane Doe',
      employeeCode: 'EMP101',
      payrollCycle: '2026-04',
      basic: '75000.00',
      hra: '30000.00',
      lta: '5000.00',
      specialAllowance: '15000.00',
      reimbursements: '25000.00',
      providentFund: '9000.00',
      professionalTax: '200.00',
      incomeTaxTds: '22200.00',
      grossPay: '150000.00',
      netPay: '118600.00',
      yearToDate: {
        grossPay: '150000.00',
        netPay: '118600.00',
        providentFund: '9000.00',
        professionalTax: '200.00',
        incomeTaxTds: '22200.00'
      }
    },
    rawText: 'PAYSLIP FOR APR 2026\nEmployee: Jane Doe\nGross: 150000.00\nNet: 118600.00'
  },
  TAX_PROOF: {
    fields: { instrument: 'ELSS', amount: '50000.00', financialYear: '2026-2027' },
    rawText: 'ELSS statement FY 2026-2027 amount 50000.00'
  },
  REIMBURSEMENT_PROOF: {
    fields: { vendor: 'City Clinic', amount: '2500.00', claimType: 'MEDICAL' },
    rawText: 'Medical invoice City Clinic 2500.00'
  },
  PREVIOUS_EMPLOYER: {
    fields: { form: 'Form 16', employer: 'Prior Co', taxableIncome: '800000.00' },
    rawText: 'Form 16 previous employer Prior Co'
  },
  DECLARATION: {
    fields: { regime: 'OLD', financialYear: '2026-2027' },
    rawText: 'Investment declaration Old regime FY 2026-2027'
  },
  OTHER: {
    fields: {},
    rawText: 'Unclassified document excerpt (mock).'
  }
};
