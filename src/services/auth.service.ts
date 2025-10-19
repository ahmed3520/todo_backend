import { ApiError } from '../utils/ApiError';
import { signTokens, verifyRefreshToken } from '../utils/jwt';
import type {
  AuthenticatedUser,
  JwtUserPayload,
  LoginPayload,
  RefreshTokenPayload,
  RegisterUserPayload,
  UserProfile,
} from '../types/auth.types';
import { UserModel } from '../models/user.model';

function toAuthenticatedUser(payload: JwtUserPayload): AuthenticatedUser {
  return {
    id: payload.sub,
    phone: payload.phone,
    displayName: payload.displayName,
    level: payload.level,
  };
}

function buildJwtPayload(user: AuthenticatedUser): JwtUserPayload {
  return {
    sub: user.id,
    phone: user.phone,
    displayName: user.displayName,
    level: user.level,
  };
}

async function createUser(payload: RegisterUserPayload) {
  const existingUser = await UserModel.findOne({ phone: payload.phone }).lean();

  if (existingUser) {
    throw new ApiError({
      message: 'Phone number already registered',
      statusCode: 409,
    });
  }

  const createdUser = await UserModel.create(payload);

  const user: AuthenticatedUser = {
    id: createdUser.id,
    phone: createdUser.phone,
    displayName: createdUser.displayName,
    level: createdUser.level,
  };

  const tokens = signTokens(buildJwtPayload(user));

  return { user, tokens };
}

async function authenticateUser(payload: LoginPayload) {
  const user = await UserModel.findOne({ phone: payload.phone }).select('+password');

  if (!user) {
    throw new ApiError({
      message: 'Invalid credentials',
      statusCode: 401,
    });
  }

  const isValidPassword = await user.comparePassword(payload.password);

  if (!isValidPassword) {
    throw new ApiError({
      message: 'Invalid credentials',
      statusCode: 401,
    });
  }

  const authenticatedUser: AuthenticatedUser = {
    id: user.id,
    phone: user.phone,
    displayName: user.displayName,
    level: user.level,
  };

  const tokens = signTokens(buildJwtPayload(authenticatedUser));

  return { user: authenticatedUser, tokens };
}

async function rotateTokens(payload: RefreshTokenPayload) {
  const decoded = verifyRefreshToken(payload.refreshToken);
  const payloadUser = toAuthenticatedUser(decoded);

  const persistedUser = await UserModel.findById(payloadUser.id).lean();

  if (!persistedUser) {
    throw new ApiError({
      message: 'User no longer exists',
      statusCode: 401,
    });
  }

  const user: AuthenticatedUser = {
    id: payloadUser.id,
    phone: persistedUser.phone,
    displayName: persistedUser.displayName,
    level: persistedUser.level,
  };

  const tokens = signTokens(buildJwtPayload(user));

  return { user, tokens };
}

async function getUserProfile(userId: string): Promise<UserProfile> {
  const user = await UserModel.findById(userId).lean();

  if (!user) {
    throw new ApiError({
      message: 'User not found',
      statusCode: 404,
    });
  }

  return {
    id: user._id.toString(),
    phone: user.phone,
    displayName: user.displayName,
    experienceYears: user.experienceYears,
    address: user.address,
    level: user.level,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export const authService = {
  register: createUser,
  login: authenticateUser,
  refresh: rotateTokens,
  profile: getUserProfile,
};
