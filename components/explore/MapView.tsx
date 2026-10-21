'use client';

/**
 * Interactive Mapbox GL map.
 *
 * Two uses:
 *  - Explore: price pills for every listing (host-created ones get a coral ring).
 *  - Host listing form: pass `draggablePin` to get ONE draggable pin the host
 *    drops on the exact spot (tap/click the map or drag the pin). In that mode
 *    the listing props can be left out.
 *
 * - One price-pill HTML marker per listing (Airbnb-style).
 * - `activeId` / `hoverId` highlight pins (driven by the list on the left).
 * - `focus` flies the camera (search, "Around Me Now"); `bottomPad` keeps the
 *   target visible above the mobile bottom sheet.
 * - "Search this area" appears after the user pans/zooms the map.
 *
 * Loaded with next/dynamic (ssr: false) because mapbox-gl needs `window`.
 */
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useEffect, useRef, useState } from 'react';
import { formatPrice } from '@/lib/format';
import type { LatLng, Listing } from '@/lib/types';

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export interface MapFocus extends LatLng {
  key: number;
  zoom?: number;
}

export interface DraggablePin {
  /** null = not placed yet (the first tap on the map places it) */
  position: LatLng | null;
  onChange: (p: LatLng) => void;
}

interface Props {
  initialCenter: LatLng;
  focus: MapFocus | null;
  user?: LatLng | null;
  listings?: Listing[];
  activeId?: string | null;
  hoverId?: string | null;
  bottomPad?: number;
  onSelect?: (id: string | null) => void;
  onSearchArea?: (center: LatLng) => void;
  draggablePin?: DraggablePin;
}

const NO_LISTINGS: Listing[] = [];
const noop = () => undefined;

interface PinRefs {
  marker: mapboxgl.Marker;
  root: HTMLDivElement;
  button: HTMLButtonElement;
}

export default function MapView({
  initialCenter,
  focus,
  user = null,
  listings = NO_LISTINGS,
  activeId = null,
  hoverId = null,
  bottomPad = 0,
  onSelect = noop,
  onSearchArea,
  draggablePin,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const pinsRef = useRef<Map<string, PinRefs>>(new Map());
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const seenRef = useRef<Set<string>>(new Set());
  const pinMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const pinChangeRef = useRef(draggablePin?.onChange);
  const onSelectRef = useRef(onSelect);
  const bottomPadRef = useRef(bottomPad);
  const [ready, setReady] = useState(false);
  const [moved, setMoved] = useState(false);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);
  useEffect(() => {
    bottomPadRef.current = bottomPad;
  }, [bottomPad]);
  useEffect(() => {
    pinChangeRef.current = draggablePin?.onChange;
  }, [draggablePin?.onChange]);

  // ── create the map once ─────────────────────────────────────
  useEffect(() => {
    if (!TOKEN || !containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [initialCenter.lng, initialCenter.lat],
      zoom: 12,
      dragRotate: false,
      pitchWithRotate: false,
    });
    map.touchZoomRotate.disableRotation();
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

    map.on('load', () => setReady(true));
    // `originalEvent` is only set for user gestures, not programmatic flyTo()
    map.on('moveend', (e) => {
      if ((e as { originalEvent?: Event }).originalEvent) setMoved(true);
    });
    map.on('click', (e) => {
      // pin-picking mode: a tap places/moves the pin; otherwise it clears the selection
      if (pinChangeRef.current) pinChangeRef.current({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      else onSelectRef.current(null);
    });

    mapRef.current = map;

    // Keep the canvas sized correctly when the layout changes (sheet, rotation…)
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);

    const pins = pinsRef.current;
    return () => {
      ro.disconnect();
      pins.clear();
      userMarkerRef.current = null;
      pinMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
    // The map is created once; later centre changes go through `focus`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── fly to a new focus (search / around me) ─────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !focus) return;
    map.flyTo({
      center: [focus.lng, focus.lat],
      zoom: focus.zoom ?? 12.5,
      padding: { top: 0, left: 0, right: 0, bottom: bottomPadRef.current },
      essential: true,
    });
    setMoved(false);
  }, [focus, ready]);

  // ── rebuild markers when the listings change ────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;

    pinsRef.current.forEach((p) => p.marker.remove());
    pinsRef.current.clear();

    listings.forEach((l) => {
      const root = document.createElement('div');
      const button = document.createElement('button');
      const price = formatPrice(l.pricePerNight, l.currency);
      button.type = 'button';
      button.className = 'price-pin';
      button.textContent = price;
      button.setAttribute('aria-label', `${l.title}, ${price} per night`);
      if (l.source === 'host') button.dataset.source = 'host'; // bookable here → coral ring
      if (seenRef.current.has(l.id)) button.dataset.seen = 'true';
      button.addEventListener('click', (e) => {
        e.stopPropagation(); // don't trigger the map's "clear selection" click
        onSelectRef.current(l.id);
      });
      root.appendChild(button);

      const marker = new mapboxgl.Marker({ element: root, anchor: 'center' })
        .setLngLat([l.lng, l.lat])
        .addTo(map);
      pinsRef.current.set(l.id, { marker, root, button });
    });
  }, [listings, ready]);

  // ── highlight active / hovered pins ─────────────────────────
  useEffect(() => {
    pinsRef.current.forEach((pin, id) => {
      const isActive = id === activeId;
      pin.button.dataset.active = String(isActive);
      pin.button.dataset.hover = String(id === hoverId);
      pin.root.style.zIndex = isActive ? '30' : id === hoverId ? '20' : '1';
    });

    if (!activeId) return;
    seenRef.current.add(activeId);

    // Bring the active pin into view if it's off-screen
    const map = mapRef.current;
    const pin = pinsRef.current.get(activeId);
    if (map && pin && !map.getBounds()?.contains(pin.marker.getLngLat())) {
      map.easeTo({
        center: pin.marker.getLngLat(),
        padding: { top: 0, left: 0, right: 0, bottom: bottomPadRef.current },
      });
    }
  }, [activeId, hoverId, listings, ready]);

  // ── the draggable "exact location" pin (host listing form) ──
  const pinLat = draggablePin?.position?.lat;
  const pinLng = draggablePin?.position?.lng;
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (pinLat == null || pinLng == null) {
      pinMarkerRef.current?.remove();
      pinMarkerRef.current = null;
      return;
    }
    if (!pinMarkerRef.current) {
      const marker = new mapboxgl.Marker({ color: '#FF5A4D', draggable: true }).setLngLat([pinLng, pinLat]).addTo(map);
      marker.on('dragend', () => {
        const p = marker.getLngLat();
        pinChangeRef.current?.({ lat: p.lat, lng: p.lng });
      });
      pinMarkerRef.current = marker;
    } else {
      pinMarkerRef.current.setLngLat([pinLng, pinLat]);
    }
  }, [pinLat, pinLng, ready]);

  // ── the live "you are here" dot ─────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (!user) {
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      return;
    }
    if (!userMarkerRef.current) {
      const el = document.createElement('div');
      el.className = 'user-dot';
      el.setAttribute('aria-label', 'Your location');
      userMarkerRef.current = new mapboxgl.Marker({ element: el }).setLngLat([user.lng, user.lat]).addTo(map);
    } else {
      userMarkerRef.current.setLngLat([user.lng, user.lat]);
    }
  }, [user, ready]);

  // ── no token → friendly setup message instead of a broken map ─
  if (!TOKEN) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-sand-100 p-8 text-center">
        <div className="max-w-sm rounded-3xl bg-white p-6 shadow-card">
          <p className="text-lg font-bold">Map needs a Mapbox token</p>
          <p className="mt-2 text-sm text-charcoal-500">
            Add <code className="rounded bg-charcoal-100 px-1.5 py-0.5">NEXT_PUBLIC_MAPBOX_TOKEN</code> to{' '}
            <code className="rounded bg-charcoal-100 px-1.5 py-0.5">.env.local</code> and restart the dev server.
            Listings still work in the list.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />

      {moved && onSearchArea && !draggablePin && (
        <button
          type="button"
          onClick={() => {
            const c = mapRef.current?.getCenter();
            if (c) onSearchArea?.({ lat: c.lat, lng: c.lng });
            setMoved(false);
          }}
          className="absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full bg-charcoal-900 px-4 py-2.5 text-sm font-semibold text-white shadow-float transition hover:bg-charcoal-800 active:scale-95"
        >
          Search this area
        </button>
      )}
    </div>
  );
}
