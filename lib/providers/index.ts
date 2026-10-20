import { apifyConfigured, apifyProvider } from './apify';
import { mockProvider } from './mock';
import type { ListingProvider } from './types';

/** Pick the data source from environment variables. Mock is the default. */
export function getProvider(): ListingProvider {
  return apifyConfigured ? apifyProvider : mockProvider;
}

/** Provider that can resolve a given listing id (mock ids always start with "m_"). */
export function getProviderForId(id: string): ListingProvider {
  return id.startsWith('m_') ? mockProvider : getProvider();
}

export { mockProvider };
