import type { Listing, SearchParams } from '../types';

/**
 * A data source for listings. To plug in a new one (official API, your own
 * database, another scraper) implement this interface and return it from
 * `getProvider()` in ./index.ts.
 */
export interface ListingProvider {
  name: 'mock' | 'apify';
  /** Return candidate listings near the search centre. Filtering is applied afterwards. */
  search(params: SearchParams): Promise<Listing[]>;
  /** Return one listing by id, or null if unknown. */
  getById(id: string): Promise<Listing | null>;
}
