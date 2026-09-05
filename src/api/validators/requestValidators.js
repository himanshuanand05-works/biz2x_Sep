import { ValidationError } from '../../utils/errors.js';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const financialYearPattern = /^\d{4}-\d{4}$/;
const payrollCyclePattern = /^\d{4}-\d{2}$/;

function requireObject(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ValidationError('Request body must be an object');
  }
  return body;
}

function optionalString(body, field) {
  if (body[field] !== undefined && typeof body[field] !== 'string') {
    throw new ValidationError(`${field} must be a string`, [field]);
  }
}

export function validateTokenRequest(req, res, next) {
  try {
    const body = requireObject(req.body);
    if (typeof body.email !== 'string' || !emailPattern.test(body.email.trim())) {
      throw new ValidationError('email must be a valid email address', ['email']);
    }
    if (typeof body.password !== 'string' || !body.password) {
      throw new ValidationError('password is required', ['password']);
    }
    body.email = body.email.trim().toLowerCase();
    next();
  } catch (error) {
    next(error);
  }
}

export function validateRefreshRequest(req, res, next) {
  try {
    const body = requireObject(req.body);
    if (typeof body.refreshToken !== 'string' || !body.refreshToken.trim()) {
      throw new ValidationError('refreshToken is required', ['refreshToken']);
    }
    next();
  } catch (error) {
    next(error);
  }
}

export function validateAssistantRequest(req, res, next) {
  try {
    const body = requireObject(req.body);
    if (typeof body.query !== 'string' || !body.query.trim()) {
      throw new ValidationError('query is required', ['query']);
    }
    for (const field of ['financialYear', 'payrollCycle', 'proposed80C']) optionalString(body, field);
    if (body.financialYear && !financialYearPattern.test(body.financialYear)) {
      throw new ValidationError('financialYear must use YYYY-YYYY format', ['financialYear']);
    }
    if (body.payrollCycle && !payrollCyclePattern.test(body.payrollCycle)) {
      throw new ValidationError('payrollCycle must use YYYY-MM format', ['payrollCycle']);
    }
    body.query = body.query.trim();
    next();
  } catch (error) {
    next(error);
  }
}
