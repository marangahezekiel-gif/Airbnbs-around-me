/**
 * Zero-config driver: one JSON file on disk (`.data/db.json`).
 *
 * This is what runs when no DATABASE_URL / SUPABASE_URL is set, so
 * `npm install && npm run dev` works with nothing to set up. It is meant for
 * local development and demos only:
 *  - writes are serialised inside one Node process (not across processes);
 *  - on Vercel the filesystem is read-only except /tmp, which is wiped
 *    regularly — use Supabase (or Postgres through Prisma) in production.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { matches, type Driver, type Row, type TableName } from './types';

type Db = Record<TableName, Row[]>;

const dir = process.env.DATA_DIR || (process.env.VERCEL ? '/tmp/aam-data' : path.join(process.cwd(), '.data'));
const file = path.join(dir, 'db.json');

const empty = (): Db => ({ profiles: [], listings: [], units: [], bookings: [] });

// A simple promise-chain mutex so concurrent requests never interleave read-modify-write.
let queue: Promise<unknown> = Promise.resolve();
function locked<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

async function read(): Promise<Db> {
  try {
    return { ...empty(), ...(JSON.parse(await fs.readFile(file, 'utf8')) as Partial<Db>) };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return empty();
    throw err;
  }
}

async function write(db: Db): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db));
  await fs.rename(tmp, file); // atomic replace
}

export const jsonDriver: Driver = {
  name: 'json',

  select: (table, where) =>
    locked(async () => {
      const rows = (await read())[table];
      return where ? rows.filter((r) => matches(r, where)) : rows;
    }),

  selectIn: (table, field, values) =>
    locked(async () => {
      const set = new Set(values);
      return (await read())[table].filter((r) => set.has(String(r[field])));
    }),

  insert: (table, row) =>
    locked(async () => {
      const db = await read();
      db[table].push(row);
      await write(db);
    }),

  update: (table, id, patch) =>
    locked(async () => {
      const db = await read();
      const row = db[table].find((r) => r.id === id);
      if (!row) return false;
      Object.assign(row, patch);
      await write(db);
      return true;
    }),

  remove: (table, where) =>
    locked(async () => {
      if (!Object.keys(where).length) throw new Error('remove() needs a filter');
      const db = await read();
      db[table] = db[table].filter((r) => !matches(r, where));
      await write(db);
    }),
};
