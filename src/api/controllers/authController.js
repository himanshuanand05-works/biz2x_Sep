import { authenticationService } from '../../services/identity/AuthenticationService.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { tokenResponse, userResponse } from '../responseContracts.js';

export async function issueToken(req, res) {
  const tokens = await authenticationService.issueToken(req.body.email, req.body.password);
  return sendSuccess(res, tokenResponse(tokens), 200);
}

export async function refreshToken(req, res) {
  const tokens = await authenticationService.refreshToken(req.body.refreshToken);
  return sendSuccess(res, tokenResponse(tokens));
}

export async function getCurrentUser(req, res) {
  return sendSuccess(res, userResponse(await authenticationService.getCurrentUser(req.user.userId)));
}
