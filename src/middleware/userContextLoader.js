import { userContextService } from '../services/identity/UserContextService.js';

/** Loads user-scoped context once for routes that need eligibility information. */
export async function userContextLoader(req, res, next) {
  try {
    req.context = await userContextService.load(req.user.userId);
    return next();
  } catch (error) { return next(error); }
}
