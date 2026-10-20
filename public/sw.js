/* Airbnbs Around Me — service worker (hand-written, no build step).
 *
 * Strategy overview
 *  - Navigations (HTML):     network-first (5 s timeout) → cached copy → /offline
 *  - /_next/static, /icons:  cache-first (files are content-hashed / rarely change)
 *  - /api/listings:          network-first → cached copy  (this is "offline cached searches")
 *  - Images (cross-origin):  cache-first, stored via CORS fetch so they don't bloat quota
 *  - Everything else (geocoding, push, map tiles): straight to the network
 *
 * Bump VERSION to invalidate all caches on the next deploy.
 */
const VERSION = 'v1';
const CACHES = {
  static: `aam-static-${VERSION}`,
  pages: `aam-pages-${VERSION}`,
  api: `aam-api-${VERSION}`,
  img: `aam-img-${VERSION}`,
};
const OFFLINE_URL = '/offline';
const PRECACHE = ['/icons/icon-192.png', '/icons/icon-512.png'];

// ───────────────────────── lifecycle ─────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHES.static);
      await cache.addAll(PRECACHE);

      // Cache the offline page AND the JS/CSS it needs, so it renders with no network.
      try {
        const res = await fetch(OFFLINE_URL);
        const html = await res.clone().text();
        await cache.put(OFFLINE_URL, res);
        const assets = new Set(html.match(/\/_next\/static\/[^"'\\\s]+\.(?:css|js)/g) || []);
        await Promise.all([...assets].map((a) => cache.add(a).catch(() => undefined)));
      } catch (_) {
        /* offline during install — skip, it will be cached on a later visit */
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = Object.values(CACHES);
      for (const key of await caches.keys()) {
        if (key.startsWith('aam-') && !keep.includes(key)) await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});

// ───────────────────────── fetch routing ─────────────────────────
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (req.mode === 'navigate') {
    event.respondWith(handleNavigation(req));
    return;
  }

  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
      event.respondWith(cacheFirst(req, CACHES.static));
    } else if (url.pathname === '/api/listings') {
      event.respondWith(networkFirstJson(req, CACHES.api, 6000, 40));
    }
    return; // other same-origin requests (RSC payloads, geocode, push) → network
  }

  if (req.destination === 'image') {
    event.respondWith(cachedCrossOriginImage(req));
  }
});

// ───────────────────────── strategies ─────────────────────────
function fetchWithTimeout(req, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    fetch(req).then(
      (res) => {
        clearTimeout(timer);
        resolve(res);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

async function handleNavigation(req) {
  const cache = await caches.open(CACHES.pages);
  try {
    const res = await fetchWithTimeout(req, 5000);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (_) {
    // Offline: reuse any cached copy of this page (ignoring ?query so /explore?lat=… still opens the shell)
    const hit = (await cache.match(req)) || (await cache.match(req, { ignoreSearch: true }));
    if (hit) return hit;
    const offline = await caches.match(OFFLINE_URL);
    return offline || new Response('You are offline.', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }
}

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

async function networkFirstJson(req, cacheName, timeoutMs, maxEntries) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetchWithTimeout(req, timeoutMs);
    if (res.ok) {
      cache.put(req, res.clone());
      trim(cacheName, maxEntries);
    }
    return res;
  } catch (_) {
    const hit = await cache.match(req);
    if (hit) return hit;
    return new Response(JSON.stringify({ error: 'offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Cross-origin <img> requests are "opaque" and each can count ~7 MB toward storage quota.
// Re-fetch them with CORS so we only store real, correctly-sized responses; if the host
// doesn't allow CORS, fall back to a normal (uncached) request.
async function cachedCrossOriginImage(req) {
  const cache = await caches.open(CACHES.img);
  const hit = await cache.match(req.url);
  if (hit) return hit;
  try {
    const res = await fetch(new Request(req.url, { mode: 'cors', credentials: 'omit' }));
    if (res.ok) {
      cache.put(req.url, res.clone());
      trim(CACHES.img, 150);
      return res;
    }
  } catch (_) {
    /* CORS refused or offline – try the original request below */
  }
  return fetch(req);
}

// ───────────────────────── push notifications (optional) ─────────────────────────
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = { body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Price drop near you', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag,
      data: { url: data.url || '/explore' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of windows) {
        if ('focus' in client) {
          await client.focus();
          if ('navigate' in client) await client.navigate(target);
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});
