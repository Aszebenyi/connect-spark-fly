interface LogContext {
  userId?: string;
  endpoint?: string;
  [key: string]: unknown;
}

export function logError(error: unknown, context: LogContext) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'error',
    message,
    stack,
    ...context,
  }));
}

export function logInfo(message: string, context: LogContext = {}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    message,
    ...context,
  }));
}

export function logWarning(message: string, context: LogContext = {}) {
  console.warn(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'warning',
    message,
    ...context,
  }));
}
