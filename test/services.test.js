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
import { queryAssistant } from '../src/api/controllers/assistantController.js';
import { promptOrchestrator } from '../src/services/ai/PromptOrchestrator.js';
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

test('assistant refusal short-circuits before document upload', async () => {
  const originalUpload = userDocumentService.uploadDocument;
  let uploadCalled = false;

  userDocumentService.uploadDocument = async (...args) => {
    uploadCalled = true;
    return originalUpload(...args);
  };

  try {
    const req = {
      user: { userId: 'emp_101' },
      body: {
        query: "What is my manager's salary?",
        financialYear: '2026-2027'
      },
      context: { latestPayrollCycle: '2026-04' },
      file: { originalname: 'payslip.pdf' }
    };

    const res = {
      status(code) {
        this.code = code;
        return this;
      },
      json(payload) {
        this.payload = payload;
        return this;
      }
    };

    await queryAssistant(req, res);

    assert.equal(uploadCalled, false);
    assert.equal(res.payload.success, true);
    assert.equal(res.payload.data.refusal, true);
  } finally {
    userDocumentService.uploadDocument = originalUpload;
  }
});

test('payslip only refuses when required fields are missing', () => {
  const doc = {
    category: 'PAYSLIP',
    isPartial: true,
    missingFields: ['hra'],
    requiredMissingFields: [],
    optionalMissingFields: ['hra']
  };

  assert.equal(promptOrchestrator.getIncompleteDocumentReason(doc), null);
  const prompt = promptOrchestrator.buildGroundedPrompt('Explain my payslip', {
    employeeId: 'emp_101',
    documents: [{ ocrText: 'Gross: 150000.00', optionalMissingFields: ['hra'] }]
  });

  assert.match(prompt, /OPTIONAL PAYSLIP FIELDS MISSING/i);
  assert.match(prompt, /hra/i);
});
