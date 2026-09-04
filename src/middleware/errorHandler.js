import { AppError } from '../utils/errors.js';
import { sendError } from '../utils/apiResponse.js';
import { logger } from '../config/logger.js';

/** Converts known application failures into the public error envelope. */
export function errorHandler(error, req, res, next) {
  const appError = error instanceof AppError ? error : new AppError('Internal server error', 'INTERNAL_ERROR', 500);
  const logLevel = error instanceof AppError && appError.statusCode < 500 ? 'warn' : 'error';
  logger.log(logLevel, 'Request failed', {
    method: req.method,
    path: req.originalUrl,
    statusCode: appError.statusCode,
    errorCode: appError.code,
    userId: req.user?.userId,
    message: error.message,
    stack: error.stack
  });
  if (res.headersSent) return next(error);
  return sendError(res, appError, appError.statusCode);
}
