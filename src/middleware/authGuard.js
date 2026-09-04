import { localOAuth2Service } from '../services/identity/LocalOAuth2Service.js';
import { UnauthorizedError } from '../utils/errors.js';

/** Validates the bearer token and derives the only trusted user scope. */
export function authGuard(req, res, next) {
  const header = req.get('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return next(new UnauthorizedError('Authentication required'));
  }
  try {
    const claims = localOAuth2Service.validateAccessToken(token);
    req.user = { userId: claims.sub, email: claims.email, name: claims.name, scopes: claims.scope?.split(' ') ?? [] };
    return next();
  } catch (error) {
    return next(error);
  }
}
