import { Router } from 'express';
import { authGuard } from '../../middleware/authGuard.js';
import { createRateLimiter } from '../../middleware/rateLimiter.js';
import { env } from '../../config/env.js';
import { asyncRoute } from '../asyncRoute.js';
import { issueToken, refreshToken, getCurrentUser } from '../controllers/authController.js';
import { validateTokenRequest, validateRefreshRequest } from '../validators/requestValidators.js';

const router = Router();
const authLimiter = createRateLimiter(env.rateLimitAuthMax);

router.post('/token', authLimiter, validateTokenRequest, asyncRoute(issueToken));
router.post('/refresh', authLimiter, validateRefreshRequest, asyncRoute(refreshToken));
router.get('/me', authGuard, asyncRoute(getCurrentUser));

export default router;
