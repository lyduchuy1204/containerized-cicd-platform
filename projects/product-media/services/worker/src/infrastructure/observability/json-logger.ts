import { LogFields, Logger, LogLevel } from '../../application/ports/logger';

const LEVEL_SEVERITY: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

export class JsonLogger implements Logger {
  private readonly threshold: number;

  constructor(minimumLevel: LogLevel) {
    this.threshold = LEVEL_SEVERITY[minimumLevel];
  }

  error(message: string, fields?: LogFields): void {
    this.emit('error', message, fields);
  }

  warn(message: string, fields?: LogFields): void {
    this.emit('warn', message, fields);
  }

  info(message: string, fields?: LogFields): void {
    this.emit('info', message, fields);
  }

  debug(message: string, fields?: LogFields): void {
    this.emit('debug', message, fields);
  }

  private emit(level: LogLevel, message: string, fields?: LogFields): void {
    if (LEVEL_SEVERITY[level] > this.threshold) {
      return;
    }
    const record = {
      level,
      time: new Date().toISOString(),
      msg: message,
      ...fields,
    };
    const target = level === 'error' ? process.stderr : process.stdout;
    target.write(`${JSON.stringify(record)}\n`);
  }
}
