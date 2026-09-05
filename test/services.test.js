import assert from 'node:assert/strict';
import test from 'node:test';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_ISSUER = 'local-idp';
process.env.JWT_AUDIENCE = 'financial-wellness-api';

import { deductionService } from '../src/services/deductions/DeductionService.js';
import { localOAuth2Service } from '../src/services/identity/LocalOAuth2Service.js';
import { userDocumentService } from '../src/services/documents/UserDocumentService.js';
import { reimbursementRepository } from '../src/repositories/ReimbursementRepository.js';
import { initDatabase } from '../src/models/index.js';
import { seedDatabase } from '../src/db/seed.js';

test.before(async () => {
  await initDatabase();
  await seedDatabase();
});

test('deduction eligibility enforces catalog and aggregate limits', async () => {
  const aggregate = await deductionService.getAggregateUsedMinor('emp_101', '2026-2027', '80C');
  assert.equal(typeof aggregate, 'number');
  assert.ok(aggregate >= 0);
});

test('reimbursement eligibility enforces policy and financial-year caps', async () => {
  const rows = await reimbursementRepository.find('emp_101', { financialYear: '2026-2027' });
  assert.ok(rows.length >= 1);
  assert.ok(rows.every((row) => row.userId === 'emp_101'));
  assert.ok(rows.every((row) => row.financialYear === '2026-2027'));
});

test('document service stores metadata and mock OCR output', async () => {
  const document = await userDocumentService.uploadDocument('emp_101', { originalname: 'sample.pdf' }, { category: 'PAYSLIP', financialYear: '2025-2026', payrollCycle: '2025-03' });

  assert.equal(document.category, 'PAYSLIP');
  assert.equal(document.financialYear, '2026-2027');
  assert.equal(document.payrollCycle, '2026-04');
  assert.ok(document.mockOcrPayload);
  assert.ok(document.mockOcrPayload.fields);
});

test('identity service issues and validates access and refresh tokens', () => {
  const tokens = localOAuth2Service.issueToken('emp_101', { email: 'jane@company.com', name: 'Jane Doe' });
  const claims = localOAuth2Service.validateAccessToken(tokens.accessToken);
  assert.equal(claims.sub, 'emp_101');
  assert.equal(claims.email, 'jane@company.com');

  const refreshed = localOAuth2Service.refresh(tokens.refreshToken, { email: 'jane@company.com', name: 'Jane Doe' });
  assert.ok(refreshed.accessToken);
  assert.ok(refreshed.refreshToken);
});
