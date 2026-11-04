import { z } from "zod";

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(10),
});
const serverSchema = z.object({
  DEMO_EMAIL: z.string().email().optional(),
  DEMO_PASSWORD: z.string().min(6).optional(),
  DEMO_ORG_ID: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().optional(),
  APP_URL: z.string().url().optional(),
});

export const publicEnv = () =>
  publicSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
export const serverEnv = () => serverSchema.parse(process.env);
