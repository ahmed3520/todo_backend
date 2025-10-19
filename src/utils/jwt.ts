import jwt, { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';

import { JWT_CONFIG } from '../config/constants';
import { ApiError } from './ApiError';
import type { AuthTokens, JwtUserPayload } from '../types/auth.types';

const { accessSecret, refreshSecret, accessTokenName, refreshTokenName } = JWT_CONFIG;

const accessExpiresIn = JWT_CONFIG.accessTtl as SignOptions['expiresIn'];
const refreshExpiresIn = JWT_CONFIG.refreshTtl as SignOptions['expiresIn'];

function signToken(
  payload: JwtUserPayload,
  secret: string,
  expiresIn: SignOptions['expiresIn']
) {
  return jwt.sign(payload, secret, { expiresIn });
}

function verifyToken(token: string, secret: string, tokenName: string): JwtUserPayload {
  try {
    return jwt.verify(token, secret) as JwtUserPayload;
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      throw new ApiError({
        message: `${tokenName} expired`,
        statusCode: 401,
        details: { tokenName, expiredAt: error.expiredAt },
      });
    }

    if (error instanceof JsonWebTokenError) {
      throw new ApiError({
        message: `${tokenName} invalid`,
        statusCode: 401,
        details: { tokenName, reason: error.message },
      });
    }

    throw error;
  }
}

export function signTokens(payload: JwtUserPayload): AuthTokens {
  return {
    accessToken: signToken(payload, accessSecret, accessExpiresIn),
    refreshToken: signToken(payload, refreshSecret, refreshExpiresIn),
  };
}

export function verifyAccessToken(token: string): JwtUserPayload {
  return verifyToken(token, accessSecret, accessTokenName);
}

export function verifyRefreshToken(token: string): JwtUserPayload {
  return verifyToken(token, refreshSecret, refreshTokenName);
}
