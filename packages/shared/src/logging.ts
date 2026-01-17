import loglevel, { type LogLevelDesc, type LogLevelNames } from "loglevel";

export type LogContext = Record<string, unknown>;
export type LogData = Record<string, unknown>;

export type LogPayload = {
  timestamp: string;
  level: LogLevelNames;
  logger: string;
  message: string;
  context?: LogContext;
  data?: LogData;
  error?: {
    name?: string;
    message?: string;
    stack?: string;
    details?: unknown;
  };
};

export type LogTransport = (payload: LogPayload) => void | Promise<void>;

export type LogDetails = {
  context?: LogContext;
  data?: LogData;
  error?: unknown;
};

const defaultTransport: LogTransport = (payload) => {
  const json = JSON.stringify(payload);
  const level = payload.level;

  if (level === "error") {
    console.error(json);
    return;
  }

  if (level === "warn") {
    console.warn(json);
    return;
  }

  if (level === "info") {
    console.info(json);
    return;
  }

  if (level === "debug") {
    console.debug(json);
    return;
  }

  console.log(json);
};

let activeTransport: LogTransport = defaultTransport;
let baseContext: LogContext = {};
let configured = false;
const defaultMethodFactory = loglevel.methodFactory;

const isEmptyObject = (value: LogContext): boolean =>
  Object.keys(value).length === 0;

const normalizeError = (error: unknown): LogPayload["error"] => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }

  if (typeof error === "string") {
    return { message: error };
  }

  if (error) {
    return {
      message: "Non-error exception",
      details: error
    };
  }

  return undefined;
};

const buildPayload = (
  methodName: LogLevelNames,
  loggerName: string,
  args: unknown[]
): LogPayload => {
  let message = "log";
  let data: LogData | undefined;
  let error: unknown;
  let details: LogDetails | undefined;

  if (typeof args[0] === "string") {
    message = args[0];
    details = args[1] as LogDetails | undefined;
  } else if (args[0] instanceof Error) {
    message = args[0].message;
    error = args[0];
    details = args[1] as LogDetails | undefined;
  } else if (args[0]) {
    data = args[0] as LogData;
    details = args[1] as LogDetails | undefined;
  }

  if (details?.data) {
    data = details.data;
  }

  if (details?.error) {
    error = details.error;
  }

  const context = {
    ...baseContext,
    ...(details?.context ?? {})
  };

  return {
    timestamp: new Date().toISOString(),
    level: methodName,
    logger: loggerName,
    message,
    context: isEmptyObject(context) ? undefined : context,
    data,
    error: normalizeError(error)
  };
};

const ensureConfigured = () => {
  if (configured) {
    return;
  }

  loglevel.methodFactory = (methodName, _level, loggerName) => {
    return (...args) => {
      const payload = buildPayload(methodName, loggerName ?? "root", args);
      const result = activeTransport(payload);
      if (result instanceof Promise) {
        result.catch(() => undefined);
      }
    };
  };

  loglevel.setLevel(loglevel.getLevel());
  configured = true;
};

export const configureLogging = (options?: {
  level?: LogLevelDesc;
  transport?: LogTransport;
  context?: LogContext;
}): void => {
  ensureConfigured();

  if (options?.transport) {
    activeTransport = options.transport;
  }

  if (options?.context) {
    baseContext = { ...baseContext, ...options.context };
  }

  if (options?.level) {
    loglevel.setLevel(options.level);
  }
};

export const setLogTransport = (transport: LogTransport): void => {
  ensureConfigured();
  activeTransport = transport;
};

export const setLogLevel = (level: LogLevelDesc): void => {
  ensureConfigured();
  loglevel.setLevel(level);
};

export const resetLogging = (): void => {
  loglevel.methodFactory = defaultMethodFactory;
  activeTransport = defaultTransport;
  baseContext = {};
  configured = false;
};

export const createLogger = (name: string, context: LogContext = {}) => {
  ensureConfigured();
  const logger = loglevel.getLogger(name);

  const withContext = (details?: LogDetails): LogDetails | undefined => {
    if (!details && isEmptyObject(context)) {
      return details;
    }

    return {
      ...details,
      context: {
        ...context,
        ...(details?.context ?? {})
      }
    };
  };

  return {
    trace: (message: string, details?: LogDetails) =>
      logger.trace(message, withContext(details)),
    debug: (message: string, details?: LogDetails) =>
      logger.debug(message, withContext(details)),
    info: (message: string, details?: LogDetails) =>
      logger.info(message, withContext(details)),
    warn: (message: string, details?: LogDetails) =>
      logger.warn(message, withContext(details)),
    error: (message: string, details?: LogDetails) =>
      logger.error(message, withContext(details))
  };
};
