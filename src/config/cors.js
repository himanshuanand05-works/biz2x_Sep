/**
 * CORS origin whitelist derived from ALLOWED_ORIGINS.
 */
import { env } from './env.js';

export const corsOptions = {
  origin(origin, callback) {
    // Allow same-origin / non-browser tools (curl, health checks) with no Origin header.
    if (!origin) {
      callback(null, true);
      return;
    }
    if (env.allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Origin not allowed by CORS policy'));
  },
  credentials: true
};
