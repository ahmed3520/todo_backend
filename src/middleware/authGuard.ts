import { type NextFunction, type Request, type Response } from 'express';

import { ApiError } from '../utils/ApiError';
import type { AuthenticatedUser } from '../types/auth.types';
import { verifyAccessToken } from '../utils/jwt';

export function authGuard(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(
      new ApiError({
        message: 'Unauthorized',
        statusCode: 401,
      })
    );
  }

  const token = authHeader.slice('Bearer '.length).trim();

  if (!token) {
    return next(
      new ApiError({
        message: 'Unauthorized',
        statusCode: 401,
      })
    );
  }

  try {
    const payload = verifyAccessToken(token);

    (req as Request & { user?: AuthenticatedUser }).user = {
      id: payload.sub,
      phone: payload.phone,
      displayName: payload.displayName,
      level: payload.level,
    };

    return next();
  } catch (error) {
    if (error instanceof ApiError) {
      return next(
        new ApiError({
          message: 'Unauthorized',
          statusCode: 401,
          details: error.details,
        })
      );
    }

    return next(
      new ApiError({
        message: 'Unauthorized',
        statusCode: 401,
      })
    );
  }
}
