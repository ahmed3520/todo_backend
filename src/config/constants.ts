import { appConfig } from './environment';

export const APP_NAME = 'Todo API';

export const SERVER_PORT = appConfig.port;
export const NODE_ENV = appConfig.nodeEnv;

export const JWT_CONFIG = {
  accessSecret: appConfig.jwt.accessSecret,
  refreshSecret: appConfig.jwt.refreshSecret,
  accessTtl: appConfig.jwt.accessTtl,
  refreshTtl: appConfig.jwt.refreshTtl,
  accessTokenName: 'accessToken',
  refreshTokenName: 'refreshToken',
};

export const PAGINATION = {
  defaultLimit: 20,
  maxLimit: 100,
  defaultPage: 1,
};

export const BCRYPT_SALT_ROUNDS = 12;

export const RESPONSE_MESSAGES = {
  genericSuccess: 'Request completed successfully.',
  genericError: 'Something went wrong. Please try again later.',
};

export const HEADERS = {
  requestId: 'x-request-id',
  correlationId: 'x-correlation-id',
};
