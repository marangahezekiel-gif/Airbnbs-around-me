/**
 * Prisma driver (SQLite by default — see prisma/schema.prisma).
 *
 * Active when DATABASE_URL is set and Supabase is not.
 *
 * `@prisma/client` is an *optional* dependency and is loaded at runtime with
 * a non-analysable import, so the app still installs, builds and runs (on the
 * JSON driver) even where Prisma's engine download is blocked or
 * `prisma generate` has not run.
 *
 * Setup:  npm run db:generate && npm run db:push
 */
import type { Driver, Row, TableName } from './types';

// Our table names → the model delegates Prisma generates (prisma.profile, …)
const DELEGATE: Record<TableName, string> = {
  profiles: 'profile',
  listings: 'listing',
  units: 'unit',
  bookings: 'booking',
};

const g = globalThis as unknown as { __aamPrisma?: any };

async function delegate(table: TableName): Promise<any> {
  if (!g.__aamPrisma) {
    const pkg = '@prisma/client';
    // webpackIgnore + a variable: bundlers must not try to resolve this at build time.
    const { PrismaClient } = (await import(/* webpackIgnore: true */ pkg)) as any;
    g.__aamPrisma = new PrismaClient();
  }
  return g.__aamPrisma[DELEGATE[table]];
}

export const prismaDriver: Driver = {
  name: 'prisma',

  async select(table, where) {
    return (await delegate(table)).findMany({ where: where ?? {} }) as Promise<Row[]>;
  },

  async selectIn(table, field, values) {
    if (!values.length) return [];
    return (await delegate(table)).findMany({ where: { [field]: { in: values } } }) as Promise<Row[]>;
  },

  async insert(table, row) {
    await (await delegate(table)).create({ data: row });
  },

  async update(table, id, patch) {
    try {
      await (await delegate(table)).update({ where: { id }, data: patch });
      return true;
    } catch (err) {
      if ((err as { code?: string }).code === 'P2025') return false; // record not found
      throw err;
    }
  },

  async remove(table, where) {
    if (!Object.keys(where).length) throw new Error('remove() needs a filter');
    await (await delegate(table)).deleteMany({ where });
  },
};
