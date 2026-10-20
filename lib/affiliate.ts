/**
 * Affiliate link builder (server-side only — reads non-public env vars).
 *
 * Two common affiliate setups are supported:
 *
 *  A) Query-param style:   AFFILIATE_PARAMS="af=12345&c=aam"
 *     → https://www.airbnb.com/rooms/123?af=12345&c=aam
 *
 *  B) Tracking-link style: AFFILIATE_LINK_TEMPLATE="https://network.example/click?id=1&u={url}"
 *     → {url} is replaced with the URL-encoded Airbnb link.
 *
 * Check Airbnb's current affiliate/partner programme terms and the exact link
 * format your network gives you, then set whichever variable matches.
 */
export function buildAffiliateUrl(airbnbUrl: string): string {
  const template = process.env.AFFILIATE_LINK_TEMPLATE;
  if (template && template.includes('{url}')) {
    return template.replace('{url}', encodeURIComponent(airbnbUrl));
  }

  const params = process.env.AFFILIATE_PARAMS;
  if (!params) return airbnbUrl;

  try {
    const u = new URL(airbnbUrl);
    new URLSearchParams(params).forEach((value, key) => u.searchParams.set(key, value));
    return u.toString();
  } catch {
    return airbnbUrl;
  }
}
