import { z } from 'zod';

const booleanFromEnv = z.preprocess((value) => {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0' || normalized === '')
      return false;
  }

  return value;
}, z.boolean());

export const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().min(1).default('0.0.0.0'),
  DATABASE_URL: z.string().min(1),
  APP_PASSWORD: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  INSTANCE_NAME: z.string().min(1).default('Send to Self'),
  UPLOAD_DIR: z.string().min(1).default('./uploads'),
  REMOTE_CLIENT_ENABLED: booleanFromEnv.default(false),
  REMOTE_CLIENT_ALLOWED_ORIGINS: z.string().default(''),
});

export type AppEnv = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>) {
  return envSchema.parse(config);
}
