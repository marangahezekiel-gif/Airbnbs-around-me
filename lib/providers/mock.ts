import { buildMockListing, generateMockListings, parseMockId } from '../mock-data';
import type { ListingProvider } from './types';

/** Default provider: deterministic fake listings, no API keys needed. */
export const mockProvider: ListingProvider = {
  name: 'mock',
  async search({ lat, lng }) {
    return generateMockListings({ lat, lng });
  },
  async getById(id) {
    const parsed = parseMockId(id);
    if (!parsed) return null;
    return buildMockListing(parsed.latE2, parsed.lngE2, parsed.index);
  },
};
