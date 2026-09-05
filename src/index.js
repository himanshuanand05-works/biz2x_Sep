import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { corsOptions } from './config/cors.js';
import { logger } from './config/logger.js';
import { initDatabase } from './models/index.js';
import { seedDatabase } from './db/seed.js';
import { errorHandler } from './middleware/errorHandler.js';
import { swaggerDocument } from './api/swagger.js';
import { sendSuccess } from './utils/apiResponse.js';
import { healthResponse } from './api/responseContracts.js';
import authRoutes from './api/routes/auth.routes.js';
import assistantRoutes from './api/routes/assistant.routes.js';
import { NotFoundError } from './utils/errors.js';


export const app = express();
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.get('/health', (req, res) => sendSuccess(res, healthResponse()));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/assistant/query', assistantRoutes);
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
