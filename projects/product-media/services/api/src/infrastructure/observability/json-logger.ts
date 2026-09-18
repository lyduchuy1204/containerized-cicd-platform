import { LoggerService } from '@nestjs/common';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const LEVEL_SEVERITY: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

type LogRecord = Record<string, unknown>;

export class JsonLogger implements LoggerService {
  private readonly threshold: number;

  constructor(minimumLevel: LogLevel) {
    this.threshold = LEVEL_SEVERITY[minimumLevel];
  }

  log(message: unknown, ...details: unknown[]): void {
    this.emit('info', message, details);
  }

  error(message: unknown, ...details: unknown[]): void {
    this.emit('error', message, details);
  }

  warn(message: unknown, ...details: unknown[]): void {
    this.emit('warn', message, details);
  }

  debug(message: unknown, ...details: unknown[]): void {
    this.emit('debug', message, details);
  }

  verbose(message: unknown, ...details: unknown[]): void {
    this.emit('debug', message, details);
  }

  fatal(message: unknown, ...details: unknown[]): void {
    this.emit('error', message, details);
  }

  private emit(level: LogLevel, message: unknown, details: unknown[]): void {
    if (LEVEL_SEVERITY[level] > this.threshold) {
      return;
    }
    const record: LogRecord = {
      level,
      time: new Date().toISOString(),
      ...describeMessage(message),
      ...describeContext(details),
    };
    const target = level === 'error' ? process.stderr : process.stdout;
    target.write(`${JSON.stringify(record)}\n`);
  }
}

function describeMessage(message: unknown): LogRecord {
  if (message instanceof Error) {
    return { msg: message.message, errorName: message.name };
  }
  if (typeof message === 'object' && message !== null) {
    return { ...(message as LogRecord) };
  }
  return { msg: String(message) };
}

function describeContext(details: unknown[]): LogRecord {
  const context = details.find((detail) => typeof detail === 'string');
  return context === undefined ? {} : { context: context as string };
}
