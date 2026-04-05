type LogLevel = "DEBUG" | "INFO" | "WARNING" | "ERROR" | "CRITICAL";

const isProduction = process.env.NODE_ENV === "production";

const SENSITIVE_KEYS = ["telefone", "nome", "nomeContato", "email"];

function maskValue(key: string, value: unknown): unknown {
  if (typeof value !== "string" || !value) return value;

  if (key === "telefone") {
    // 5511999001818 → 55119****1818
    return value.length >= 8
      ? value.slice(0, 5) + "****" + value.slice(-4)
      : "****";
  }

  if (key === "nome" || key === "nomeContato") {
    // "Denise Silva" → "Den***"
    return value.length > 3 ? value.slice(0, 3) + "***" : "***";
  }

  if (key === "email") {
    // "user@email.com" → "us***@email.com"
    const atIndex = value.indexOf("@");
    if (atIndex > 2) {
      return value.slice(0, 2) + "***" + value.slice(atIndex);
    }
    return "***" + value.slice(atIndex);
  }

  return value;
}

function sanitizeContext(context?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!context || !isProduction) return context;

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    if (SENSITIVE_KEYS.includes(key)) {
      sanitized[key] = maskValue(key, value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function log(level: LogLevel, message: string, context?: Record<string, unknown>) {
  const safeContext = sanitizeContext(context);

  const entry = {
    severity: level,
    message,
    ...safeContext,
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
