import { type NextFunction, type Request, type Response } from 'express';

import type {
  AuthenticatedUser,
  AuthTokens,
  LoginPayload,
  RefreshTokenPayload,
  RegisterUserPayload,
  UserProfile,
} from '../types/auth.types';
import { authService } from '../services/auth.service';
import { successResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';

interface AuthResult {
  user: AuthenticatedUser;
  tokens: AuthTokens;
}

function mapAuthResult({ user, tokens }: AuthResult) {
  return {
    id: user.id,
    displayName: user.displayName,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}

type RegisterRequest = Request<unknown, unknown, RegisterUserPayload>;
type LoginRequest = Request<unknown, unknown, LoginPayload>;
type RefreshRequest = Request<unknown, unknown, RefreshTokenPayload>;
type RequestWithUser = Request & { user?: AuthenticatedUser };

async function register(req: RegisterRequest, res: Response, _next: NextFunction) {
  const result = await authService.register(req.body);
  const payload = mapAuthResult(result);

  res.status(201).json(successResponse({ data: payload, message: 'Account created successfully.' }));
}

async function login(req: LoginRequest, res: Response, _next: NextFunction) {
  const result = await authService.login(req.body);
  const payload = mapAuthResult(result);

  res.status(200).json(successResponse({ data: payload, message: 'Authentication successful.' }));
}

async function refresh(req: RefreshRequest, res: Response, _next: NextFunction) {
  const result = await authService.refresh(req.body);
  const payload = mapAuthResult(result);

  res.status(200).json(successResponse({ data: payload, message: 'Tokens refreshed.' }));
}

async function profile(req: RequestWithUser, res: Response, _next: NextFunction) {
  const user = req.user;

  if (!user) {
    throw new ApiError({
      message: 'Unauthorized',
      statusCode: 401,
    });
  }

  const data: UserProfile = await authService.profile(user.id);

  res.status(200).json(successResponse({ data, message: 'Profile retrieved successfully.' }));
}

export const authController = {
  register,
  login,
  refresh,
  profile,
};
