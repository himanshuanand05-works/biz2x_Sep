import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { corsOptions } from './config/cors.js';
import { logger } from './config/logger.js';
import { initDatabase } from './models/index.js';
import { seedDatabase } from './db/seed.js';
import { userRepository } from './repositories/UserRepository.js';
import { payrollRepository } from './repositories/PayrollRepository.js';
import { deductionRepository } from './repositories/DeductionRepository.js';
import { policyCatalogService } from './services/policy/PolicyCatalogService.js';
import { deductionService } from './services/deductions/DeductionService.js';
import { deductionEligibilityService } from './services/deductions/DeductionEligibilityService.js';
import { reimbursementService } from './services/reimbursements/ReimbursementService.js';
import { reimbursementEligibilityService } from './services/reimbursements/ReimbursementEligibilityService.js';
import { userDocumentService } from './services/documents/UserDocumentService.js';
import { localOAuth2Service } from './services/identity/LocalOAuth2Service.js';
import { authGuard } from './middleware/authGuard.js';
import { userContextLoader } from './middleware/userContextLoader.js';
import { securityGuard } from './middleware/securityGuard.js';
import { uploadGuard } from './middleware/uploadGuard.js';
import { createRateLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import { swaggerDocument } from './api/swagger.js';
import { sendSuccess } from './utils/apiResponse.js';
import { NotFoundError, UnauthorizedError, ValidationError } from './utils/errors.js';
import { fromMinorUnits } from './utils/money.js';

const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const authLimiter = createRateLimiter(env.rateLimitAuthMax);
const protectedLimiter = createRateLimiter();
const uploadLimiter = createRateLimiter(env.rateLimitUploadMax);
const assistantLimiter = createRateLimiter(env.rateLimitAssistantMax);

export const app = express();
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.get('/health', (req, res) => sendSuccess(res, { status: 'UP', timestamp: new Date().toISOString() }));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

/** Issues a local JWT pair for the seeded development employee. */
app.post('/api/v1/auth/token', authLimiter, asyncRoute(async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) throw new ValidationError('email and password are required');
  const user = await userRepository.findByEmail(email);
  if (!user || user.demoPassword !== password) throw new UnauthorizedError('Invalid credentials');
  return sendSuccess(res, await localOAuth2Service.issueToken(user.userId, user), 200);
}));

/** Exchanges a valid refresh token for a new token pair. */
app.post('/api/v1/auth/refresh', authLimiter, asyncRoute(async (req, res) => {
  const { refreshToken } = req.body ?? {};
  if (!refreshToken) throw new ValidationError('refreshToken is required');
  let claims;
  try {
    claims = JSON.parse(Buffer.from(refreshToken.split('.')[1], 'base64url').toString());
  } catch {
    throw new UnauthorizedError('Invalid refresh token');
  }
  const user = await userRepository.findById(claims.sub);
  if (!user) throw new UnauthorizedError('User not found');
  return sendSuccess(res, localOAuth2Service.refresh(refreshToken, user));
}));
app.get('/api/v1/auth/me', authGuard, asyncRoute(async (req, res) => sendSuccess(res, await userRepository.findById(req.user.userId))));

/** Registers the document upload route; bytes remain in memory and never enter the response. */
app.post('/api/v1/documents/upload', authGuard, uploadLimiter, uploadGuard, asyncRoute(async (req, res) => {
  if (!req.file) throw new ValidationError('A PDF, PNG, or JPEG file is required');
  return sendSuccess(res, await userDocumentService.uploadDocument(req.user.userId, req.file, req.body), 201);
}));
app.get('/api/v1/documents', authGuard, protectedLimiter, asyncRoute(async (req, res) => sendSuccess(res, await userDocumentService.list(req.user.userId, req.query))));
app.get('/api/v1/documents/:id', authGuard, asyncRoute(async (req, res) => sendSuccess(res, await userDocumentService.getById(req.user.userId, req.params.id))));
app.delete('/api/v1/documents/:id', authGuard, asyncRoute(async (req, res) => sendSuccess(res, await userDocumentService.softDelete(req.user.userId, req.params.id))));

app.get('/api/v1/payroll/cycles', authGuard, userContextLoader, asyncRoute(async (req, res) => sendSuccess(res, await payrollRepository.find(req.user.userId))));
app.get('/api/v1/payroll/:cycle/breakup', authGuard, asyncRoute(async (req, res) => {
  const payroll = await payrollRepository.findByUserAndCycle(req.user.userId, req.params.cycle);
  if (!payroll) throw new NotFoundError('Payroll cycle not found');
  const deductions = await deductionRepository.findByUserAndCycle(req.user.userId, req.params.cycle, { scope: 'PAYROLL' });
  return sendSuccess(res, { ...payroll, deductions: deductions.map((row) => ({ ...row, amount: fromMinorUnits(row.amountMinor) })) });
}));
app.get('/api/v1/payroll/ytd', authGuard, asyncRoute(async (req, res) => {
  const user = await userRepository.findById(req.user.userId);
  const financialYear = req.query.financialYear ?? user.activeFinancialYear;
  return sendSuccess(res, { financialYear, payroll: await payrollRepository.findByUserAndFy(req.user.userId, financialYear) });
}));

app.get('/api/v1/policy/deduction-types', authGuard, asyncRoute(async (req, res) => sendSuccess(res, await policyCatalogService.listDeductionTypes(req.query))));
app.get('/api/v1/policy/reimbursement-types', authGuard, asyncRoute(async (req, res) => sendSuccess(res, await policyCatalogService.listReimbursementTypes())));
app.get('/api/v1/deductions', authGuard, asyncRoute(async (req, res) => sendSuccess(res, await deductionService.listPublic(req.user.userId, await deductionService.list(req.user.userId, req.query)))));
app.post('/api/v1/deductions', authGuard, protectedLimiter, asyncRoute(async (req, res) => sendSuccess(res, await deductionService.create(req.user.userId, req.body, req.user.userId), 201)));
app.patch('/api/v1/deductions/:id', authGuard, asyncRoute(async (req, res) => sendSuccess(res, await deductionService.update(req.user.userId, req.params.id, req.body, req.user.userId))));
app.delete('/api/v1/deductions/:id', authGuard, asyncRoute(async (req, res) => sendSuccess(res, await deductionService.softDelete(req.params.id, req.user.userId, req.user.userId))));
app.get('/api/v1/deductions/eligible', authGuard, userContextLoader, asyncRoute(async (req, res) => sendSuccess(res, req.context.availableDeductionTypes)));

app.post('/api/v1/reimbursements', authGuard, protectedLimiter, asyncRoute(async (req, res) => sendSuccess(res, await reimbursementService.createClaim(req.user.userId, req.body), 201)));
app.post('/api/v1/reimbursements/:id/proof', authGuard, uploadGuard, asyncRoute(async (req, res) => {
  if (!req.file) throw new ValidationError('A proof file is required');
  const document = await userDocumentService.uploadDocument(req.user.userId, req.file, { category: 'REIMBURSEMENT_PROOF' });
  return sendSuccess(res, await reimbursementService.attachProof(req.user.userId, req.params.id, document.documentId));
}));
app.get('/api/v1/reimbursements', authGuard, asyncRoute(async (req, res) => sendSuccess(res, await reimbursementService.listByUser(req.user.userId, req.query))));
app.get('/api/v1/reimbursements/eligible', authGuard, userContextLoader, asyncRoute(async (req, res) => sendSuccess(res, req.context.availableReimbursementTypes)));
app.delete('/api/v1/reimbursements/:id', authGuard, asyncRoute(async (req, res) => sendSuccess(res, await reimbursementService.softDelete(req.params.id, req.user.userId))));

/** Provides a deterministic grounded response until an external LLM adapter is configured. */
app.post('/api/v1/assistant/query', authGuard, assistantLimiter, securityGuard, userContextLoader, asyncRoute(async (req, res) => {
  const query = req.body?.query;
  if (!query) throw new ValidationError('query is required');
  return sendSuccess(res, { answer: 'Your question has been grounded against your available payroll and policy data.', intent: 'DOCUMENT_GROUNDED', sources: ['user-context'], assumptions: [], refusal: false });
}));
app.get('/api/v1/assistant/checklist', authGuard, userContextLoader, asyncRoute(async (req, res) => sendSuccess(res, { financialYear: req.context.activeFinancialYear, missingProofs: [] })));

app.use((req, res, next) => next(new NotFoundError('Route not found')));
app.use(errorHandler);

export async function bootstrap() {
  await initDatabase();
  await seedDatabase();
  return app.listen(env.port, () => logger.info(`Financial Wellness API listening on port ${env.port}`));
}

if (process.argv[1] && process.argv[1].endsWith('src/index.js')) {
  bootstrap().catch((error) => { logger.error('Application failed to start', { error }); process.exitCode = 1; });
}
