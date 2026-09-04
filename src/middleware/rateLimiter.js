import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

/** Creates a limiter keyed by the authenticated employee when available. */
export function createRateLimiter(max = env.rateLimitMax) {
  return rateLimit({
    windowMs: env.rateLimitWindowMs,
    max,
    keyGenerator: (req) => req.user?.userId ? `user:${req.user.userId}` : `ip:${req.ip}`,
    standardHeaders: true,
    legacyHeaders: false
  });
}
