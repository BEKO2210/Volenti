import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';
import { loadEnv } from './src/lib/validation/env';

// drizzle-kit runs outside Next.js, so we load + validate env explicitly here.
const env = loadEnv();

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/lib/db/schema.ts',
  out: './src/lib/db/migrations',
  dbCredentials: {
    url: env.DATABASE_URL,
  },
  strict: true,
  verbose: true,
});
