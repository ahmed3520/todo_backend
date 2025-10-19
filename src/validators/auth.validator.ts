import { z } from 'zod';

import { LEVELS } from '../models/user.model';

const phoneRegex = /^\+?[1-9]\d{9,14}$/;

const passwordSchema = z.string().min(8).max(100);

export const registerSchema = {
  body: z.object({
    phone: z.string().regex(phoneRegex, 'Phone must be 10-15 digits, optionally starting with +'),
    password: passwordSchema,
    displayName: z.string().min(1).max(100),
    experienceYears: z.coerce.number().int().min(0).optional(),
    address: z.string().max(255).optional(),
    level: z.enum(LEVELS).optional(),
  }),
};

export const loginSchema = {
  body: z.object({
    phone: z.string().regex(phoneRegex, 'Invalid phone number'),
    password: passwordSchema,
  }),
};

export const refreshTokenSchema = {
  body: z.object({
    refreshToken: z.string().min(1),
  }),
};

export const changePasswordSchema = {
  body: z
    .object({
      currentPassword: passwordSchema,
      newPassword: passwordSchema,
    })
    .refine((data) => data.currentPassword !== data.newPassword, {
      message: 'New password must be different from current password',
      path: ['newPassword'],
    }),
};
