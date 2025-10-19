import { type UserLevel } from '../models/user.model';

export interface RegisterUserPayload {
  phone: string;
  password: string;
  displayName: string;
  experienceYears?: number;
  address?: string;
  level?: UserLevel;
}

export interface LoginPayload {
  phone: string;
  password: string;
}

export interface RefreshTokenPayload {
  refreshToken: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JwtUserPayload {
  sub: string;
  phone: string;
  displayName: string;
  level: UserLevel;
}

export interface AuthenticatedUser {
  id: string;
  phone: string;
  displayName: string;
  level: UserLevel;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface UserProfile {
  id: string;
  phone: string;
  displayName: string;
  experienceYears: number;
  address?: string;
  level: UserLevel;
  createdAt: Date;
  updatedAt: Date;
}
