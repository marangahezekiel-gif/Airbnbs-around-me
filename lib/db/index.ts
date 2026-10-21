import { jsonDriver } from './json-driver';
import { prismaDriver } from './prisma-driver';
import { supabaseDriver } from './supabase-driver';
import type { Driver } from './types';

/**
 * Pick the storage backend from environment variables:
 *   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY → Supabase (hosted Postgres)
 *   DATABASE_URL                             → Prisma (SQLite locally)
 *   neither                                  → local JSON file (zero setup)
 */
export function getDriver(): Driver {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) return supabaseDriver;
  if (process.env.DATABASE_URL) return prismaDriver;
  return jsonDriver;
}

export type { Driver, Row, TableName } from './types';
