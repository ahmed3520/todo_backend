import express, { type NextFunction, type Request, type Response } from 'express';

import router from './routes';
import { ApiError, isApiError } from './utils/ApiError';
import { errorResponse } from './utils/ApiResponse';
import { logger } from './utils/logger';
import { getUploadsDirectory } from './services/upload.service';

const app = express();

app.disable('x-powered-by');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(getUploadsDirectory(), { fallthrough: false }));

app.use('/api', router);

app.use((_req, res) => {
  res.status(404).json(
    errorResponse({
      message: 'Resource not found',
    })
  );
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (isApiError(error)) {
    const statusCode = error.statusCode ?? 500;
    res.status(statusCode).json(
      errorResponse({
        message: error.message,
        meta: error.details ? { details: error.details } : undefined,
      })
    );
    return;
  }

  logger.error('Unhandled error', {
    error: error instanceof Error ? error.stack ?? error.message : String(error),
  });

  res.status(500).json(
    errorResponse({
      message: 'Internal server error',
    })
  );
});

export default app;
