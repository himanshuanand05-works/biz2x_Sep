/**
 * Environment loader — single place that reads process.env after dotenv.
 * Secrets must never be hardcoded; callers always go through this module.
 */
import dotenv from 'dotenv';

dotenv.config();

/**
 * Splits a comma-separated env var into a trimmed string array.
 * @param {string} value
 * @returns {string[]}
 */
function csv(value) {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

/** @type {Readonly<object>} */
export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction: (process.env.NODE_ENV ?? 'development') === 'production',
  port: Number(process.env.PORT ?? 3000),
  allowedOrigins: csv(process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000'),
  jwtSecret: process.env.JWT_SECRET ?? '',
  jwtIssuer: process.env.JWT_ISSUER ?? 'local-idp',
  jwtAudience: process.env.JWT_AUDIENCE ?? 'financial-wellness-api',
  jwtAccessExpires: process.env.JWT_ACCESS_EXPIRES ?? '1h',
  jwtRefreshExpires: process.env.JWT_REFRESH_EXPIRES ?? '7d',
  dbDialect: process.env.DB_DIALECT ?? 'sqlite',
  dbStorage: process.env.DB_STORAGE ?? ':memory:',
  databaseUrl: process.env.DATABASE_URL ?? '',
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 900000),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? 100),
  rateLimitAssistantMax: Number(process.env.RATE_LIMIT_ASSISTANT_MAX ?? 20),
  rateLimitUploadMax: Number(process.env.RATE_LIMIT_UPLOAD_MAX ?? 10),
  rateLimitAuthMax: Number(process.env.RATE_LIMIT_AUTH_MAX ?? 10),
  maxFileSizeBytes: Number(process.env.MAX_FILE_SIZE_BYTES ?? 5242880),
  llmProvider: process.env.LLM_PROVIDER ?? 'gemini',
  llmBaseUrl: process.env.LLM_BASE_URL ?? 'https://llm-wrapper-741152993481.asia-south1.run.app',
  llmApiKey: process.env.LLM_API_KEY ?? '',
  llmModel: process.env.LLM_MODEL ?? 'gemini-1.5-pro',
  llmTemperature: Number(process.env.LLM_TEMPERATURE ?? 0.3),
  llmTimeoutMs: Number(process.env.LLM_TIMEOUT_MS ?? 30000),
  llmJsonLimit: process.env.LLM_JSON_LIMIT ?? '8mb'
});
