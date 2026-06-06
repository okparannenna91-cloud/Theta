const IS_DEV = process.env.NODE_ENV === "development";

const LOG_PREFIX = {
  info: "[INFO]",
  warn: "[WARN]",
  error: "[ERROR]",
  debug: "[DEBUG]",
};

function formatMessage(prefix: string, message: string, ...args: any[]): string {
  const timestamp = new Date().toISOString();
  const formatted = args.length > 0 ? `${message} ${args.map(a => typeof a === "object" ? JSON.stringify(a) : String(a)).join(" ")}` : message;
  return `${timestamp} ${prefix} ${formatted}`;
}

export const logger = {
  info: (message: string, ...args: any[]) => {
    if (IS_DEV) {
      console.log(formatMessage(LOG_PREFIX.info, message, ...args));
    }
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(formatMessage(LOG_PREFIX.warn, message, ...args));
  },
  error: (message: string, ...args: any[]) => {
    console.error(formatMessage(LOG_PREFIX.error, message, ...args));
  },
  debug: (message: string, ...args: any[]) => {
    if (IS_DEV) {
      console.log(formatMessage(LOG_PREFIX.debug, message, ...args));
    }
  },
};
