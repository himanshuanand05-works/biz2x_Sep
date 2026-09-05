import { userRepository } from '../../repositories/UserRepository.js';
import { localOAuth2Service } from '../../services/identity/LocalOAuth2Service.js';
import { UnauthorizedError } from '../../utils/errors.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { tokenResponse, userResponse } from '../responseContracts.js';

export async function issueToken(req, res) {
  const user = await userRepository.findByEmail(req.body.email);
  if (!user || user.demoPassword !== req.body.password) throw new UnauthorizedError('Invalid credentials');
  return sendSuccess(res, tokenResponse(localOAuth2Service.issueToken(user.userId, user)), 200);
}

export async function refreshToken(req, res) {
  let claims;
  try {
    claims = JSON.parse(Buffer.from(req.body.refreshToken.split('.')[1], 'base64url').toString());
  } catch {
    throw new UnauthorizedError('Invalid refresh token');
  }
  const user = await userRepository.findById(claims.sub);
  if (!user) throw new UnauthorizedError('User not found');
  return sendSuccess(res, tokenResponse(localOAuth2Service.refresh(req.body.refreshToken, user)));
}

export async function getCurrentUser(req, res) {
  return sendSuccess(res, userResponse(await userRepository.findById(req.user.userId)));
}
