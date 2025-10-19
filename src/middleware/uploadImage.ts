import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';

import { ensureUploadsDirectory, getUploadsDirectory } from '../services/upload.service';
import { ApiError } from '../utils/ApiError';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    try {
      ensureUploadsDirectory();
      cb(null, getUploadsDirectory());
    } catch (error) {
      cb(error as Error, getUploadsDirectory());
    }
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const imageMimeTypes = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']);

function imageFileFilter(_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (imageMimeTypes.has(file.mimetype)) {
    cb(null, true);
    return;
  }

  cb(
    new ApiError({
      message: 'Unsupported image format',
      statusCode: 415,
    })
  );
}

export const imageUpload = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});
