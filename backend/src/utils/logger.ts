type LogLevel = "DEBUG" | "INFO" | "WARNING" | "ERROR" | "CRITICAL";

const isProduction = process.env.NODE_ENV === "production";

function log(level: LogLevel, message: string, context?: Record<string, unknown>) {
  const entry = {
    severity: level,
    message,
    ...context,
    timestamp: new Date().toISOString(),
  };

  if (isProduction) {
    console.log(JSON.stringify(entry));
  } else {
    const colors: Record<LogLevel, string> = {
      DEBUG: "\x1b[36m",
      INFO: "\x1b[32m",
      WARNING: "\x1b[33m",
      ERROR: "\x1b[31m",
      CRITICAL: "\x1b[35m",
    };
    const reset = "\x1b[0m";
    const color = colors[level];
    console.log(`${color}[${level}]${reset} ${message}`, context || "");
  }
}

const logger = {
  debug: (message: string, context?: Record<string, unknown>) => log("DEBUG", message, context),
  info: (message: string, context?: Record<string, unknown>) => log("INFO", message, context),
  warn: (message: string, context?: Record<string, unknown>) => log("WARNING", message, context),
  error: (message: string, context?: Record<string, unknown>, error?: unknown) => {
    const errorContext = error instanceof Error
      ? { ...context, errorMessage: error.message, stack: error.stack }
      : { ...context, error };
    log("ERROR", message, errorContext);
  },
  critical: (message: string, context?: Record<string, unknown>) => log("CRITICAL", message, context),
};

export default logger;
