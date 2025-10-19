type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogMethod = (message: string, meta?: Record<string, unknown>) => void;

interface Logger {
  debug: LogMethod;
  info: LogMethod;
  warn: LogMethod;
  error: LogMethod;
}

function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  const payload = meta ? { ...meta } : undefined;

  switch (level) {
    case 'debug':
      console.debug(`[${timestamp}] [DEBUG] ${message}`, payload ?? '');
      break;
    case 'info':
      console.info(`[${timestamp}] [INFO] ${message}`, payload ?? '');
      break;
    case 'warn':
      console.warn(`[${timestamp}] [WARN] ${message}`, payload ?? '');
      break;
    case 'error':
      console.error(`[${timestamp}] [ERROR] ${message}`, payload ?? '');
      break;
  }
}

export const logger: Logger = {
  debug: (message, meta) => log('debug', message, meta),
  info: (message, meta) => log('info', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  error: (message, meta) => log('error', message, meta),
};
