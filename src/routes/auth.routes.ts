import { Router } from 'express';

import { authController } from '../controllers/auth.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { authGuard } from '../middleware/authGuard';
import { validateRequest } from '../middleware/validateRequest';
import { loginSchema, refreshTokenSchema, registerSchema } from '../validators/auth.validator';

const router = Router();

router.post('/register', validateRequest(registerSchema), asyncHandler(authController.register));
router.post('/login', validateRequest(loginSchema), asyncHandler(authController.login));
router.post('/refresh', validateRequest(refreshTokenSchema), asyncHandler(authController.refresh));
router.get('/profile', authGuard, asyncHandler(authController.profile));

export default router;
