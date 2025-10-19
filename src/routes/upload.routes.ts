import { Router } from 'express';

import { uploadController } from '../controllers/upload.controller';
import { asyncHandler } from '../middleware/asyncHandler';
import { authGuard } from '../middleware/authGuard';
import { imageUpload } from '../middleware/uploadImage';

const router = Router();

router.use(authGuard);

router.post('/image', imageUpload.single('image'), asyncHandler(uploadController.image));

export default router;
