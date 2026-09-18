export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export type LogFields = Record<string, string | number | boolean>;

export interface Logger {
  error(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  debug(message: string, fields?: LogFields): void;
}
