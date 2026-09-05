import { Router } from 'express';
import { authGuard } from '../../middleware/authGuard.js';
import { userContextLoader } from '../../middleware/userContextLoader.js';
import { securityGuard } from '../../middleware/securityGuard.js';
import { uploadGuard } from '../../middleware/uploadGuard.js';
import { createRateLimiter } from '../../middleware/rateLimiter.js';
import { env } from '../../config/env.js';
import { asyncRoute } from '../asyncRoute.js';
import { queryAssistant } from '../controllers/assistantController.js';
import { validateAssistantRequest } from '../validators/requestValidators.js';

const router = Router();
const assistantLimiter = createRateLimiter(env.rateLimitAssistantMax);

router.post('/', authGuard, assistantLimiter, uploadGuard, validateAssistantRequest, securityGuard, userContextLoader, asyncRoute(queryAssistant));

export default router;
