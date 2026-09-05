/** Versioned, non-sensitive company policy documents used for grounded explanations. */
export const companyPolicyFixtures = [
  {
    policyId: 'company-pay-components-fy2026',
    title: 'Salary components and payroll deductions',
    category: 'PAYROLL_COMPONENTS',
    keywords: ['salary', 'pay', 'basic', 'hra', 'lta', 'special allowance', 'pf', 'professional tax', 'tds', 'deduction', 'gross', 'net'],
    effectiveFrom: '2026-04-01',
    version: 'FY2026-v1',
    source: 'Company payroll policy',
    content: 'Basic salary is the fixed base component. HRA is a salary allowance shown separately where applicable. LTA and special allowance are shown as separate components when applicable. Employee PF, professional tax, and income-tax TDS are payroll deductions that can reduce net pay. Gross pay is the total earnings before payroll deductions; net pay is the amount after applicable payroll deductions.'
  },
  {
    policyId: 'company-reimbursement-fy2026',
    title: 'Reimbursement policy',
    category: 'REIMBURSEMENTS',
    keywords: ['reimbursement', 'medical', 'internet', 'wfh', 'connectivity', 'lta', 'claim', 'bill', 'proof'],
    effectiveFrom: '2026-04-01',
    version: 'FY2026-v1',
    source: 'Company reimbursement policy',
    content: 'Reimbursement claims require the applicable proof document. Medical claims are available to active and probation employees within the annual policy cap. Internet or work-from-home connectivity claims require an eligible rank, at least three months of tenure, and valid bills. LTA claims require an active employee, at least twelve months of tenure, and travel proof. Eligibility, caps, status, and approval are evaluated from the policy catalog and employee records.'
  },
  {
    policyId: 'company-proof-fy2026',
    title: 'Investment and payroll proof policy',
    category: 'PROOFS',
    keywords: ['proof', 'document', 'investment', '80c', '80d', 'nps', 'declaration', 'tax'],
    effectiveFrom: '2026-04-01',
    version: 'FY2026-v1',
    source: 'Company tax-proof policy',
    content: 'Declarations that require evidence must be supported by the relevant proof document before verification. ELSS and PPF declarations use tax-proof documents. Health insurance and eligible NPS declarations also require tax-proof documents. A missing proof means the declaration exists but no linked proof document is recorded for it.'
  },
  {
    policyId: 'company-rank-pay-bands-fy2026',
    title: 'Illustrative rank-wise pay structure',
    category: 'RANK_PAY_STRUCTURE',
    keywords: ['rank', 'band', 'pay structure', 'salary range', 'compensation', 'l3', 'l4', 'l5', 'm2'],
    effectiveFrom: '2026-04-01',
    version: 'FY2026-v1',
    source: 'Company compensation policy',
    content: 'Illustrative monthly gross-pay bands for this prototype are: L3 INR 40,000-70,000; L4 INR 60,000-110,000; L5 INR 100,000-180,000; M2 INR 150,000-280,000. These are demonstration ranges, not an employee-specific offer, guarantee, or payroll calculation. An employee-specific answer must use the employee payroll record when available.'
  },
  {
    policyId: 'government-tax-basics-fy2026',
    title: 'Government tax concepts used by the prototype',
    category: 'GOVERNMENT_TAX',
    keywords: ['government', 'tax', 'tds', '80c', '80d', 'income tax', 'pf', 'professional tax'],
    effectiveFrom: '2026-04-01',
    version: 'FY2026-reference',
    source: 'Simplified reference assumptions; verify against official government guidance',
    content: 'TDS is income tax withheld from salary based on the employer tax calculation. Section 80C declarations are modeled with a combined prototype limit of INR 150,000 for the Old Tax Regime. The assistant must use deterministic simulation results for savings estimates and must not present this simplified reference as complete or current tax advice.'
  }
];
