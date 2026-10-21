/**
 * The secret used to sign session cookies. Edge-safe (no Node imports) because
 * middleware.ts uses it too.
 *
 * In production NEXTAUTH_SECRET is REQUIRED (generate one with
 * `openssl rand -base64 32`). In development a fixed fallback keeps
 * `npm run dev` working with zero setup — never deploy with it.
 */
export const AUTH_SECRET: string | undefined =
  process.env.NEXTAUTH_SECRET || (process.env.NODE_ENV === 'production' ? undefined : 'dev-only-secret-change-me');
