import "dotenv/config";
import { z } from "zod";

/**
 * Validate process.env once, at startup, instead of letting `undefined`
 * config values surface as confusing runtime errors deep in a request.
 * If this throws, the process exits before it ever binds a port.
 */
const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_KEY: z.string().min(1, "API_KEY must be set"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL must be set"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  EMAIL_PROVIDER: z.enum(["console"]).default("console"),
  // "prisma" is the real, persistent adapter (SQLite file via Prisma). "memory" is a
  // zero-dependency in-process adapter used for tests/local dev without a database —
  // both implement the exact same repository ports (see src/domain/repositories).
  PERSISTENCE_DRIVER: z.enum(["prisma", "memory"]).default("prisma"),
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    // eslint-disable-next-line no-console
    console.error(`Invalid environment configuration:\n${issues}`);
    process.exit(1);
  }
  return parsed.data;
}
