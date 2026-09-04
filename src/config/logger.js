/**
 * Winston structured logger — replace console.log across the app.
 */
import winston from 'winston';
import { env } from './env.js';

export const logger = winston.createLogger({
  level: env.isProduction ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'financial-wellness' },
  transports: [new winston.transports.Console()]
});
