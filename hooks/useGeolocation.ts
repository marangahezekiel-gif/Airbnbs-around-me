'use client';

import { useCallback, useEffect, useState } from 'react';
import { haversineKm } from '@/lib/geo';
import type { LatLng } from '@/lib/types';

export type GeoStatus = 'idle' | 'loading' | 'granted' | 'denied' | 'unavailable' | 'unsupported';

/**
 * Browser geolocation with a one-shot `request()` (used on load and by the
 * "Around Me Now" button) plus live updates once permission is granted.
 */
export function useGeolocation() {
  const [position, setPosition] = useState<LatLng | null>(null);
  const [status, setStatus] = useState<GeoStatus>('idle');

  const request = useCallback(
    () =>
      new Promise<LatLng | null>((resolve) => {
        if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
          setStatus('unsupported');
          resolve(null);
          return;
        }
        setStatus('loading');
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setPosition(p);
            setStatus('granted');
            resolve(p);
          },
          (err) => {
            setStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable');
            resolve(null);
          },
          { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 },
        );
      }),
    [],
  );

  // Keep the blue "you are here" dot live after permission is granted.
  useEffect(() => {
    if (status !== 'granted') return;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        // Ignore GPS jitter (<15 m) to avoid needless re-renders
        setPosition((prev) => (prev && haversineKm(prev, next) < 0.015 ? prev : next));
      },
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 15_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [status]);

  return { position, status, request };
}
