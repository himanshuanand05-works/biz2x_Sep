import { verifyPassword } from '../../utils/password.js';
import { UnauthorizedError } from '../../utils/errors.js';
import { localOAuth2Service } from './LocalOAuth2Service.js';
import { UserService } from './UserService.js';

/** Coordinates credential lookup and local identity-provider token flows. */
export class AuthenticationService {
  async issueToken(email, password) {
    const user = await UserService.findByEmail(email);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedError('Invalid credentials');
    }
    return localOAuth2Service.issueToken(user.userId, user);
  }

  async refreshToken(refreshToken) {
    const claims = localOAuth2Service.validateRefreshToken(refreshToken);
    const user = await UserService.findById(claims.sub);
    if (!user) throw new UnauthorizedError('User not found');
    return localOAuth2Service.refresh(refreshToken, user);
  }

  async getCurrentUser(userId) {
    return UserService.findById(userId);
  }
}

export const authenticationService = new AuthenticationService();