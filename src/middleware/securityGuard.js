import { ValidationError } from '../utils/errors.js';

const injectionPatterns = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /disregard\s+(the\s+)?(system|above)/i,
  /you\s+are\s+now/i,
  /reveal\s+(your\s+)?(system\s+)?prompt/i,
  /jailbreak/i
];

/** Removes markup and rejects common prompt-injection attempts. */
export function securityGuard(req, res, next) {
  const query = String(req.body?.query ?? '');
  if (injectionPatterns.some((pattern) => pattern.test(query))) {
    return next(new ValidationError('Query contains disallowed instructions'));
  }
  if (req.body?.query) req.body.query = query.replace(/<[^>]*>/g, '').trim();
  return next();
}
