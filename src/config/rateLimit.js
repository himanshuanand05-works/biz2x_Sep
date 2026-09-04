/**
 * Rate-limit numeric config from environment.
 */
import { env } from './env.js';

export const rateLimitConfig = {
  windowMs: env.rateLimitWindowMs,
  max: env.rateLimitMax,
  assistantMax: env.rateLimitAssistantMax,
  uploadMax: env.rateLimitUploadMax,
  authMax: env.rateLimitAuthMax
};
