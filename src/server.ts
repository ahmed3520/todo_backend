import http from 'node:http';

import app from './app';
import { connectDatabase, disconnectDatabase } from './config/database';
import { appConfig } from './config/environment';
import { logger } from './utils/logger';

let server: http.Server | undefined;

async function startServer() {
  try {
    await connectDatabase();
    logger.info('Database connection established');

    server = app.listen(appConfig.port, () => {
      logger.info(`Server running on port ${appConfig.port}`);
    });
  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.stack ?? error.message : String(error),
    });
    process.exit(1);
  }
}

async function shutdown(reason: string) {
  logger.warn(`Shutting down: ${reason}`);

  if (server) {
    await new Promise<void>((resolve, reject) => {
      server?.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    }).catch((error) => {
      logger.error('Error during HTTP shutdown', {
        error: error instanceof Error ? error.stack ?? error.message : String(error),
      });
    });
  }

  await disconnectDatabase().catch((error) => {
    logger.error('Error disconnecting database', {
      error: error instanceof Error ? error.stack ?? error.message : String(error),
    });
  });

  process.exit(0);
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', {
    error: error instanceof Error ? error.stack ?? error.message : String(error),
  });
  void shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', {
    reason: reason instanceof Error ? reason.stack ?? reason.message : String(reason),
  });
  void shutdown('unhandledRejection');
});

void startServer();
