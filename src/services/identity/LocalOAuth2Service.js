/**
 * Local OAuth2 / JWT simulation. Production should replace this with a real OIDC IdP.
 */
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { UnauthorizedError, AppError } from '../../utils/errors.js';

export class LocalOAuth2Service {
  /**
   * @param {string} userId
   * @param {{ email: string, name: string }} profile
   * @param {string} [scopes]
   */
  issueToken(userId, profile, scopes = 'payroll:read documents:write assistant:query') {
    if (!env.jwtSecret) {
      throw new AppError('JWT_SECRET is not configured', 'CONFIG_ERROR', 500);
    }
    const base = {
      sub: userId,
      email: profile.email,
      name: profile.name,
      scope: scopes,
      iss: env.jwtIssuer,
      aud: env.jwtAudience
    };
    const accessToken = jwt.sign(base, env.jwtSecret, { expiresIn: env.jwtAccessExpires });
    const refreshToken = jwt.sign(
      { ...base, type: 'refresh' },
      env.jwtSecret,
      { expiresIn: env.jwtRefreshExpires }
    );
    return { accessToken, refreshToken };
  }

  /**
   * @param {string} token
   * @returns {object} claims
   */
  validateAccessToken(token) {
    try {
      const claims = jwt.verify(token, env.jwtSecret, {
        issuer: env.jwtIssuer,
        audience: env.jwtAudience
      });
      if (claims.type === 'refresh') {
        throw new UnauthorizedError('Refresh token cannot be used as access token');
      }
      return claims;
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        throw err;
      }
      throw new UnauthorizedError('Invalid or expired access token');
    }
  }

  /**
   * @param {string} refreshToken
   * @param {{ email: string, name: string }} profile
   */
  refresh(refreshToken, profile) {
    let claims;
    try {
      claims = jwt.verify(refreshToken, env.jwtSecret, {
        issuer: env.jwtIssuer,
        audience: env.jwtAudience
      });
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
    if (claims.type !== 'refresh') {
      throw new UnauthorizedError('Not a refresh token');
    }
    return this.issueToken(claims.sub, profile, claims.scope);
  }
}

export const localOAuth2Service = new LocalOAuth2Service();
