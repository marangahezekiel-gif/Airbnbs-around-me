/**
 * Storage driver interface.
 *
 * The marketplace needs only four flat tables, so every backend (local JSON
 * file, Prisma/SQLite, Supabase) implements the same tiny set of operations
 * and the domain logic in lib/marketplace/repo.ts is written once.
 *
 * Rows are flat: strings, numbers, booleans and null. Lists (photos,
 * amenities, blocked dates) are stored as JSON strings by the repo layer.
 */
export type TableName = 'profiles' | 'listings' | 'units' | 'bookings';

export type Cell = string | number | boolean | null;
export type Row = Record<string, Cell>;

export interface Driver {
  readonly name: 'json' | 'prisma' | 'supabase';
  /** Rows where every key in `where` equals the given value (no filter = all rows). */
  select(table: TableName, where?: Row): Promise<Row[]>;
  /** Rows where `field` is any of `values`. */
  selectIn(table: TableName, field: string, values: string[]): Promise<Row[]>;
  insert(table: TableName, row: Row): Promise<void>;
  /** Merge `patch` into the row with this id. Returns false if there is no such row. */
  update(table: TableName, id: string, patch: Row): Promise<boolean>;
  /** Delete rows matching `where`. A non-empty filter is required. */
  remove(table: TableName, where: Row): Promise<void>;
}

export const matches = (row: Row, where: Row) => Object.entries(where).every(([k, v]) => row[k] === v);
