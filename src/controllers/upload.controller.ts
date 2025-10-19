import { type NextFunction, type Request, type Response } from 'express';

import { mapToUploadedImageInfo } from '../services/upload.service';
import { successResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';

async function image(req: Request, res: Response, _next: NextFunction) {
  const file = req.file;

  if (!file) {
    throw new ApiError({
      message: 'No image provided',
      statusCode: 400,
    });
  }

  const payload = mapToUploadedImageInfo(file);

  res
    .status(201)
    .json(successResponse({ data: payload, message: 'Image uploaded successfully.' }));
}

export const uploadController = {
  image,
};
