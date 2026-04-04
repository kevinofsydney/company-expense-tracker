import { z } from "zod";

const envSchema = z.object({
  ADMIN_PASSWORD: z.string().min(1, "ADMIN_PASSWORD is required."),
  SESSION_SECRET: z
    .string()
    .min(16, "SESSION_SECRET must be at least 16 characters.")
    .optional(),
  DATABASE_URL: z.string().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

let cachedEnv: z.infer<typeof envSchema> | null = null;

export function getEnv() {
  if (cachedEnv) {
    return cachedEnv;
  }

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(parsed.error.flatten().formErrors.join("\n"));
  }

  cachedEnv = {
    ...parsed.data,
    SESSION_SECRET:
      parsed.data.SESSION_SECRET ??
      (parsed.data.NODE_ENV === "production"
        ? undefined
        : "development-only-session-secret"),
  };

  if (!cachedEnv.SESSION_SECRET) {
    throw new Error("SESSION_SECRET is required in production.");
  }

  return cachedEnv;
}

export function resetEnvForTests() {
  cachedEnv = null;
}
