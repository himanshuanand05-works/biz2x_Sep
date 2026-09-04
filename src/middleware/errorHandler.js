import { AppError } from '../utils/errors.js';
import { sendError } from '../utils/apiResponse.js';

/** Converts known application failures into the public error envelope. */
export function errorHandler(error, req, res, next) {
  const appError = error instanceof AppError ? error : new AppError('Internal server error', 'INTERNAL_ERROR', 500);
  if (!(error instanceof AppError)) {
    req.log?.error?.(error);
  }
  if (res.headersSent) return next(error);
  return sendError(res, appError, appError.statusCode);
}
