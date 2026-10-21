# Airbnbs Around Me

Find perfect Airbnbs around you in seconds. A website that doubles as an installable mobile app (PWA): it asks for your location and shows nearby stays on a live map.

It is also a **two-sided marketplace**: people sign up as a **host** (list places, set the exact pin, manage booking requests) or a **guest** (find stays near them, request or instantly book, get directions). Stays that aren't hosted here still link out to Airbnb through your affiliate link. See [section 12](#12-two-sided-marketplace-hosts--guests).

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Mapbox GL JS · NextAuth (email + password) · zod · Supabase or Prisma/SQLite (or a local JSON file) · hand-written service worker (PWA) · deploys to Vercel.

> Not affiliated with Airbnb, Inc. Listings sourced via public data.

---

## 1. Quick start (works with zero API keys except the map)

```bash
npm install
cp .env.example .env.local      # then add your Mapbox token (step 2)
npm run dev                     # http://localhost:3000
```

Out of the box the app uses **mock listings** generated around whatever location you open, so every feature (map, filters, detail page, calendar) works immediately. Sign-up, the host dashboard and bookings also work with no setup: accounts and listings are saved to a local file in `.data/` (see section 12 for a real database). Real listings from Airbnb are a one-file swap (step 4).

> Geolocation needs a secure origin. `localhost` counts as secure; on a phone use your Vercel URL or an HTTPS tunnel.

## 2. Get a Mapbox token (required for the map)

1. Create a free account at <https://account.mapbox.com/>.
2. Open **Access tokens** → copy your **Default public token** (starts with `pk.`) or create a new public one.
3. Put it in `.env.local`:
   ```
   NEXT_PUBLIC_MAPBOX_TOKEN=pk.xxxxxxxx
   ```
4. Before launch, edit the token in the Mapbox dashboard and add **URL restrictions** (your production domain) so nobody can reuse it.

Without a token the list still works and the map area shows a setup message. The same token powers place search (Mapbox Geocoding). Without one, search falls back to OpenStreetMap Nominatim, which is fine for development but not for production traffic.

*Prefer Google Maps?* Only `components/explore/MapView.tsx` talks to the map library. Its props (`listings`, `activeId`, `hoverId`, `focus`, `user`, …) are library-agnostic, so you can reimplement it with `@googlemaps/js-api-loader` without touching anything else.

## 3. Environment variables

| Variable | Needed? | What it does |
| --- | --- | --- |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | **Yes** | Map + place search |
| `NEXT_PUBLIC_SITE_URL` | Recommended | Your production URL (used for metadata) |
| `NEXT_PUBLIC_DEFAULT_LAT/LNG/PLACE` | Optional | Map start if the user denies location |
| `NEXTAUTH_SECRET` | **Production** | Signs session cookies. `openssl rand -base64 32`. A dev-only fallback is used locally |
| `NEXTAUTH_URL` | Production (non-Vercel) | Your public URL. Vercel sets it automatically |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Recommended for production | Use Supabase for data and photo storage (section 12) |
| `DATABASE_URL` | Optional | Use Prisma + SQLite locally, e.g. `file:./dev.db` (section 12) |
| `INCLUDE_EXTERNAL_LISTINGS` | Optional | `false` = show only host-created listings |
| `DATA_DIR`, `UPLOAD_DIR` | Optional | Where the local JSON database / uploaded photos live |
| `APIFY_TOKEN`, `APIFY_ACTOR_ID` | Optional | Switch from mock to real listings (step 4) |
| `AFFILIATE_PARAMS` or `AFFILIATE_LINK_TEMPLATE` | Optional | Affiliate tracking (step 5) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Optional | Price-drop push notifications (step 7) |

## 4. Using real listings

All listing data flows through one interface, `ListingProvider` in `lib/providers/types.ts`:

```ts
search(params): Promise<Listing[]>   // candidates near a point
getById(id):    Promise<Listing | null>
```

`lib/providers/index.ts` picks the provider: **Apify** when `APIFY_TOKEN` and `APIFY_ACTOR_ID` are both set, otherwise **mock**. Filtering, distance sorting and affiliate links are applied afterwards in `lib/listings.ts`, so a new provider only has to return `Listing[]`.

**To use Apify:**
1. Create an account at <https://apify.com> and copy your API token (Settings → Integrations).
2. Pick an Airbnb scraper Actor from the Apify Store and run it once in the console to see its input and output JSON.
3. In `lib/providers/apify.ts`, adjust the two functions marked `ADJUST ME`: `buildInput()` (our search → the Actor's input) and `normalize()` (the Actor's output → our `Listing`).
4. Set `APIFY_TOKEN` and `APIFY_ACTOR_ID` (`username~actor-name`).

**Be aware:**
- The Apify adapter is a **skeleton that has not been run against a live Actor.** Expect to adjust field names.
- A synchronous scrape takes 20–60 s. For real traffic, scrape on a schedule into a database (Vercel KV, Postgres) and have `search()` read from there. The adapter's `getById()` only remembers results on a warm server; persist listings if you need detail pages to survive cold starts.
- Scraping Airbnb may breach Airbnb's Terms of Service. Check the Actor's terms and your own legal position before using scraped data commercially. If you have access to an official partner API, implement it as a provider instead.

## 5. Affiliate links

Every "View on Airbnb" button uses `listing.affiliateUrl`, built server-side in `lib/affiliate.ts`. Links carry `rel="sponsored nofollow noopener noreferrer"`. Choose whichever matches what your affiliate network gives you:

```bash
# A) append query parameters to the Airbnb URL
AFFILIATE_PARAMS="af=12345&c=aam"

# B) wrap the URL in a tracking link ({url} is replaced with the encoded Airbnb URL)
AFFILIATE_LINK_TEMPLATE="https://your-network.example/click?id=123&u={url}"
```

Check Airbnb's current affiliate/partner programme eligibility and exact link format before launch; both change. The footer shows the required disclaimer and an affiliate disclosure.

Note: mock listings don't exist on Airbnb, so their link opens an Airbnb **map search around the pin**. Real providers should return the real listing URL.

## 6. PWA: install and offline

- `app/manifest.ts` → `/manifest.webmanifest` (name, icons, standalone display, "Around me now" app shortcut).
- `public/sw.js` → registered in production only by `components/ServiceWorkerRegister.tsx`.
- Icons are generated from the brand mark: `npm run icons` (outputs `public/icons/*` and `app/apple-icon.png`).

What works offline: pages you've already visited, `/offline` fallback, and **cached searches**. `/api/listings` responses are cached by the service worker, and the explore page also keeps your last successful search in `localStorage` as a fallback (a banner says you're viewing saved results). Photos are cached when the image host allows CORS.

**Test it** (service workers don't run under `npm run dev`):
```bash
npm run build && npm start
```
Open <http://localhost:3000> in Chrome → DevTools → **Application** → *Manifest* / *Service Workers* (tick **Offline**, reload). Run a Lighthouse "PWA" check before launch.

**Installing:** Android/Chrome and desktop show an install button (header + landing page). On iPhone there is no install API, so the app shows the Share → *Add to Home Screen* steps. Installed apps open on `/explore?locate=1` (the map).

App-like touches: full-screen standalone mode, safe-area padding for notches, a draggable three-position bottom sheet on phones, pull-to-refresh disabled on the map, and 100dvh layouts.

## 7. Push notifications for price drops (optional)

The scaffolding is in place; the server side is a stub you finish when you want the feature.

1. Generate VAPID keys: `npx web-push generate-vapid-keys`.
2. Set `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`. Once the public key is set, a "Notify me of price drops" button appears on listing pages.
3. `app/api/push/subscribe/route.ts` receives subscriptions but **only logs them**. Persist them (Vercel KV or Postgres) together with `listingId` and the price at subscription time.
4. Add a Vercel Cron job that re-checks prices and sends a push with the `web-push` package when a price drops. `public/sw.js` already handles `push` and `notificationclick`.
5. iPhone/iPad support web push only for **installed** home-screen apps (iOS 16.4+).

## 8. Deploy to Vercel

1. Push the project to GitHub.
2. At <https://vercel.com/new> import the repo. Vercel detects Next.js; keep the default build settings.
3. Under **Environment Variables** add the values from step 3 — at least `NEXT_PUBLIC_MAPBOX_TOKEN`, `NEXT_PUBLIC_SITE_URL`, `NEXTAUTH_SECRET`, `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (Vercel's filesystem isn't persistent, so hosts need Supabase; see section 12) — for Production (and Preview if you want).
4. Deploy. Then add your Mapbox URL restriction for the new domain.
5. Test on a real phone: location prompt, *Add to Home Screen*, airplane-mode reload.

Or with the CLI: `npm i -g vercel && vercel --prod`.

The `/api/listings` route sets `maxDuration = 60` for slow scrapers; the Hobby plan may cap this lower. A scheduled scrape into a database avoids the issue.

## 9. Project structure

```
airbnbs-around-me/
├─ app/
│  ├─ layout.tsx               fonts, metadata, viewport, SW registration
│  ├─ page.tsx                 landing page (hero, how it works, features, install)
│  ├─ explore/page.tsx         map + list experience
│  ├─ listing/[id]/page.tsx    detail: gallery, host, amenities, exact-location map + directions, booking panel (or Airbnb CTA)
│  ├─ signin, signup, account  auth pages + host/guest role switch
│  ├─ host/                    dashboard, listings/new, listings/[id]/edit  (hosts only)
│  ├─ trips/page.tsx           guest's bookings (cancel, directions)
│  ├─ offline/page.tsx         service-worker fallback
│  ├─ manifest.ts              PWA manifest
│  ├─ icon.svg, apple-icon.png favicon + iOS icon
│  └─ api/
│     ├─ listings/route.ts     GET search (filters, radius)
│     ├─ geocode/route.ts      GET place search + reverse lookup (Mapbox, Nominatim fallback)
│     ├─ auth/[...nextauth], register, account/role     sign-in, sign-up, role switch
│     ├─ host/listings, host/bookings/[id]              host CRUD + accept/reject
│     ├─ bookings, bookings/[id]                        guest request / cancel
│     ├─ upload, uploads/[name]                         photo upload + local serving
│     └─ push/subscribe/route.ts   POST (stub)
├─ components/
│  ├─ explore/                 ExplorePage (state), MapView, ListPanel (bottom sheet),
│  │                           ListingCard, FiltersModal, SearchBar, AroundMeButton
│  ├─ listing/                 Gallery, AvailabilityCalendar, PriceAlertButton, BookingPanel, DateRangePicker, LocationMap
│  ├─ host/ auth/ trips/ calendar/   listing form, location picker, uploader, user menu, role switch
│  ├─ landing/                 HeroSearch, HeroMap, InstallSection
│  └─ Logo, Header, Footer, InstallPrompt, ServiceWorkerRegister
├─ hooks/                      useGeolocation, useMediaQuery
├─ lib/
│  ├─ types.ts                 Listing & friends — the one shape the UI depends on
│  ├─ providers/               mock.ts, apify.ts, index.ts  ← swap data sources here
│  ├─ listings.ts              merges host listings + external source, filters, distance, affiliate links
│  ├─ auth.ts, api-auth.ts, auth-secret.ts, password.ts, rate-limit.ts   sessions & guards
│  ├─ db/                      storage drivers: json (default), prisma, supabase
│  ├─ marketplace/             repo.ts (all reads/writes + booking rules), schemas.ts (zod), availability.ts
│  ├─ storage.ts, directions.ts photo storage, Google Maps directions link
│  ├─ affiliate.ts, filters.ts, geo.ts, format.ts, geocode.ts, push.ts, mock-data.ts
├─ middleware.ts               protects /host/*, /trips/*, /account/*
├─ prisma/schema.prisma        optional Prisma + SQLite schema
├─ supabase/schema.sql         Supabase tables
├─ public/
│  ├─ sw.js                    service worker
│  └─ icons/                   generated PNG icons
├─ scripts/generate-icons.mjs
├─ tailwind.config.ts          coral / charcoal palette
└─ .env.example
```

## 10. How the key features work

- **Location on load:** `/explore` calls the browser Geolocation API as soon as it opens. If denied, it explains why, falls back to `NEXT_PUBLIC_DEFAULT_*`, and search still works.
- **Around me now:** re-requests a fresh position and flies the map there; a pulsing blue dot tracks you live.
- **Card ⇄ pin sync:** `ExplorePage` owns `activeId`/`hoverId`. Click a card → its pin turns dark; click a pin → the list scrolls to its card.
- **Search this area:** appears after you pan or zoom the map, and re-runs the search at the new centre.
- **Distances:** shown from the user when they are within 200 km of the results, otherwise from the searched place.

## 11. Known limitations

- Mock data is placeholder content (images from picsum.photos). Real listings need step 4.
- The availability calendar is **indicative** unless your provider fills `Listing.blockedDates`.
- Rating, price and review fields from scrapers vary; validate them in `normalize()`.
- Push notifications need the server work in step 7 before they do anything.
- Host-created listings start with no reviews (shown as "New"); there is no review system yet.

## 12. Two-sided marketplace (hosts & guests)

### How it works

- **Sign up** at `/signup` and choose **guest** or **host**. Accounts are email + password (NextAuth, signed JWT cookie, scrypt-hashed passwords). Switch role any time from the avatar menu or `/account`.
- **Protected routes:** `/host/*` is hosts only, `/trips` and `/account` need sign-in. The edge middleware checks the cookie; every page and API route re-checks the role against the database, so a stale cookie never grants access.
- **Hosts** (`/host/dashboard`): create, edit and delete listings with title, description, price per night, **units available**, multiple photos (with previews, cover photo, client-side resize), amenities, house rules, **exact location** and an availability calendar. Location = search an address, then **tap the map or drag the coral pin** (it reuses `MapView.tsx`); you can also type coordinates. Booking requests appear on the dashboard with **Accept / Reject**.
- **Guests** use `/explore` as before. Host-created listings appear on the same map with price pills (coral ring), "N of M left" on the card, and open `/listing/[id]` with the gallery, house rules, an exact-location map, a **route preview** (drive/walk, Mapbox) and a **Get directions** button that opens Google Maps with the unit's exact lat/lng.
- **Booking:** the guest picks dates on a calendar that already greys out closed days and days when every unit is taken, then sends a request (or books instantly if the host enabled Instant Book). Accepting assigns a free unit. Hosts can't reduce units below what upcoming confirmed stays need. **No payment is taken** — hosts and guests settle directly; add Stripe in `POST /api/bookings` when ready.
- External (mock/Apify) listings still show "View on Airbnb" with your affiliate link. Set `INCLUDE_EXTERNAL_LISTINGS=false` to show only host-created ones.

### Choose a database

`lib/db/index.ts` picks the backend from environment variables (first match wins):

| Set | Backend | Use for |
| --- | --- | --- |
| `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | Supabase (Postgres + Storage) | **Production / Vercel** |
| `DATABASE_URL` | Prisma + SQLite | Local development with a real DB |
| nothing | JSON file in `.data/` | Zero-setup local dev and demos |

**Supabase**
1. Create a project at <https://supabase.com>.
2. SQL editor → paste and run `supabase/schema.sql`.
3. Storage → **New bucket** named `listing-photos`, tick **Public bucket**.
4. Settings → API: copy the **Project URL** into `SUPABASE_URL` and the **service_role** key into `SUPABASE_SERVICE_ROLE_KEY`. Keep the key server-side only (no `NEXT_PUBLIC_`). Add both in Vercel too.

**Prisma + SQLite (local)**
```bash
echo 'DATABASE_URL="file:./dev.db"' >> .env     # Prisma reads .env, not .env.local
npm run db:generate && npm run db:push
```
`@prisma/client` is an optional dependency loaded at runtime, so installs and builds still succeed if Prisma's engine can't be downloaded. SQLite files don't persist on Vercel; for Postgres change `provider` in `prisma/schema.prisma`.

### Things to know before launch

- Set `NEXTAUTH_SECRET` in production (the dev fallback is refused there).
- Rate limiting and booking checks run in memory, per server instance. With several instances, move them to a database constraint or Redis.
- There is no email verification, password reset or payment yet. For magic links add NextAuth's `EmailProvider` (needs SMTP).
- Signed-in pages (`/host`, `/trips`, `/account`) are never cached by the service worker, so a shared phone can't show the previous user's data offline.
- Guests see the host's exact pin on the public listing page, as requested. If you'd rather reveal it after acceptance, gate `LocationMap` in `app/listing/[id]/page.tsx`.
