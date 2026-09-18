import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  UPLOADS_DIR: z.string().min(1),
  TMP_DIR: z.string().min(1),
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive(),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  QUEUE_NAME: z.string().min(1),
  MEDIA_RETENTION_HOURS: z.coerce.number().int().positive(),
  EXPIRY_SWEEP_INTERVAL_MINUTES: z.coerce.number().int().positive(),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  GRAPHQL_PLAYGROUND: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

export type Configuration = z.infer<typeof schema>;

export const CONFIGURATION = Symbol('CONFIGURATION');

export function loadConfiguration(source: NodeJS.ProcessEnv = process.env): Configuration {
  const result = schema.safeParse(source);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid configuration: ${details}`);
  }
  return result.data;
}

