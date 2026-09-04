/**
 * Application error types. Messages are client-safe; stacks stay on the logger.
 */
export class AppError extends Error {
  /**
   * @param {string} message
   * @param {string} code
   * @param {number} [statusCode=400]
   */
  constructor(message, code, statusCode = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class ValidationError extends AppError {
  /** @param {string} message @param {string[]} [details] */
  constructor(message, details = []) {
    super(message, 'VALIDATION_ERROR', 422);
    this.details = details;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 'FORBIDDEN', 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 'NOT_FOUND', 404);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(message, 'CONFLICT', 409);
  }
}
