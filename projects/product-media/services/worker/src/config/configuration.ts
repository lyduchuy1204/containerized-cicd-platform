import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  UPLOADS_DIR: z.string().min(1),
  SCRATCH_DIR: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  QUEUE_NAME: z.string().min(1),
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(1),
  LEASE_DURATION_SECONDS: z.coerce.number().int().positive(),
  LEASE_RENEW_INTERVAL_SECONDS: z.coerce.number().int().positive(),
  MAX_ATTEMPTS: z.coerce.number().int().positive(),
  TRANSCODE_TIMEOUT_SECONDS: z.coerce.number().int().positive(),
  MAX_INPUT_BYTES: z.coerce.number().int().positive(),
  MAX_DURATION_SECONDS: z.coerce.number().int().positive(),
  FFMPEG_PRESET: z.string().min(1).default('veryfast'),
  FFMPEG_THREADS: z.coerce.number().int().nonnegative().default(0),
  THUMBNAIL_TIMESTAMP: z.string().min(1).default('00:00:01'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

export type Configuration = z.infer<typeof schema>;

export function loadConfiguration(source: NodeJS.ProcessEnv = process.env): Configuration {
  const result = schema.safeParse(source);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid configuration: ${details}`);
  }
  assertConsistent(result.data);
  return result.data;
}

function assertConsistent(configuration: Configuration): void {
  const renewTooLate =
    configuration.LEASE_RENEW_INTERVAL_SECONDS >= configuration.LEASE_DURATION_SECONDS / 2;
  if (renewTooLate) {
    throw new Error(
      'LEASE_RENEW_INTERVAL_SECONDS must be less than half of LEASE_DURATION_SECONDS',
    );
  }
  if (configuration.TRANSCODE_TIMEOUT_SECONDS <= configuration.LEASE_DURATION_SECONDS) {
    throw new Error('TRANSCODE_TIMEOUT_SECONDS must be greater than LEASE_DURATION_SECONDS');
  }
}

