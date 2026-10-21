import { apifyConfigured, apifyProvider } from './apify';
import { marketplaceProvider } from '../marketplace/provider';
import { mockProvider } from './mock';
import type { ListingProvider } from './types';

/** Pick the EXTERNAL data source from environment variables. Mock is the default. Host-created listings are merged in by lib/listings.ts. */
export function getProvider(): ListingProvider {
  return apifyConfigured ? apifyProvider : mockProvider;
}

/** Provider that can resolve a given listing id (mock ids start with "m_", host-created ones with "h_"). */
export function getProviderForId(id: string): ListingProvider {
  if (id.startsWith('h_')) return marketplaceProvider;
  return id.startsWith('m_') ? mockProvider : getProvider();
}

export { mockProvider, marketplaceProvider };
