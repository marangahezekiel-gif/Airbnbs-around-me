'use client';

/**
 * Create / edit a listing. One form, used by /host/listings/new and
 * /host/listings/[id]/edit. Everything is validated again on the server
 * (zod, lib/marketplace/schemas.ts) — this component only guides the host.
 */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent, type ReactNode } from 'react';
import { AMENITIES } from '@/lib/mock-data';
import type { HostListing } from '@/lib/marketplace/types';
import type { LatLng } from '@/lib/types';
import { BlockedDatesEditor } from './BlockedDatesEditor';
import { ImageUploader } from './ImageUploader';
import { LocationPicker } from './LocationPicker';

interface Props {
  /** Present when editing */
  listing?: HostListing;
}

const field = 'w-full rounded-2xl border border-charcoal-200 bg-white px-4 py-3 text-base outline-none transition focus:border-charcoal-900';

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-charcoal-100 bg-white p-5 shadow-card sm:p-7">
      <h2 className="text-xl font-bold">{title}</h2>
      {hint && <p className="mt-1 text-sm text-charcoal-500">{hint}</p>}
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-charcoal-400">{hint}</span>}
    </label>
  );
}

export function ListingForm({ listing }: Props) {
  const router = useRouter();
  const editing = Boolean(listing);

  const [title, setTitle] = useState(listing?.title ?? '');
  const [description, setDescription] = useState(listing?.description ?? '');
  const [pricePerNight, setPrice] = useState(String(listing?.pricePerNight ?? ''));
  const [currency, setCurrency] = useState(listing?.currency ?? 'USD');
  const [unitCount, setUnitCount] = useState(String(listing?.units.length ?? 1));
  const [propertyType, setPropertyType] = useState<'entire_place' | 'private_room'>(listing?.propertyType ?? 'entire_place');
  const [bedrooms, setBedrooms] = useState(String(listing?.bedrooms ?? 1));
  const [beds, setBeds] = useState(String(listing?.beds ?? 1));
  const [bathrooms, setBathrooms] = useState(String(listing?.bathrooms ?? 1));
  const [maxGuests, setMaxGuests] = useState(String(listing?.maxGuests ?? 2));
  const [amenities, setAmenities] = useState<string[]>(listing?.amenities ?? ['Wifi']);
  const [houseRules, setHouseRules] = useState(listing?.houseRules ?? '');
  const [photos, setPhotos] = useState<string[]>(listing?.photos ?? []);
  const [address, setAddress] = useState(listing?.address ?? '');
  const [neighborhood, setNeighborhood] = useState(listing?.neighborhood ?? '');
  const [position, setPosition] = useState<LatLng | null>(listing ? { lat: listing.lat, lng: listing.lng } : null);
  const [instantBook, setInstantBook] = useState(listing?.instantBook ?? false);
  const [blockedDates, setBlockedDates] = useState<string[]>(listing?.blockedDates ?? []);

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const toggleAmenity = (a: string) => setAmenities((cur) => (cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a]));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!position) {
      setError('Set the exact location: search an address or tap the map to drop the pin.');
      document.getElementById('location')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(editing ? `/api/host/listings/${listing!.id}` : '/api/host/listings', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          pricePerNight: Number(pricePerNight),
          currency,
          unitCount: Number(unitCount),
          propertyType,
          bedrooms: Number(bedrooms),
          beds: Number(beds),
          bathrooms: Number(bathrooms),
          maxGuests: Number(maxGuests),
          amenities,
          houseRules,
          photos,
          address,
          neighborhood,
          lat: position.lat,
          lng: position.lng,
          instantBook,
          blockedDates,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Could not save the listing.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      router.push('/host/dashboard');
      router.refresh();
    } catch {
      setError('Network problem — check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6 pb-28" noValidate>
      {error && (
        <p role="alert" className="rounded-2xl bg-coral-50 px-4 py-3 text-sm font-semibold text-coral-700">
          {error}
        </p>
      )}

      <Section title="The basics">
        <Field label="Title">
          <input className={field} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder="Sunny loft near the old town" required />
        </Field>
        <Field label="Description" hint="What makes your place special? Mention the surroundings and how guests get in.">
          <textarea className={`${field} min-h-36`} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={4000} required />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type of place">
            <select className={field} value={propertyType} onChange={(e) => setPropertyType(e.target.value as 'entire_place' | 'private_room')}>
              <option value="entire_place">Entire place</option>
              <option value="private_room">Private room</option>
            </select>
          </Field>
          <Field label="Neighbourhood (optional)">
            <input className={field} value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} maxLength={80} placeholder="Le Marais" />
          </Field>
        </div>
      </Section>

      <Section title="Price and units" hint="Units are the identical places you rent out under this listing (for example 3 rooms in a guesthouse).">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Price per night">
            <input className={field} type="number" inputMode="decimal" min={1} step="0.01" value={pricePerNight} onChange={(e) => setPrice(e.target.value)} required />
          </Field>
          <Field label="Currency">
            <input className={`${field} uppercase`} value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))} maxLength={3} />
          </Field>
          <Field label="Units available">
            <input className={field} type="number" inputMode="numeric" min={1} max={50} value={unitCount} onChange={(e) => setUnitCount(e.target.value)} required />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Max guests">
            <input className={field} type="number" inputMode="numeric" min={1} value={maxGuests} onChange={(e) => setMaxGuests(e.target.value)} />
          </Field>
          <Field label="Bedrooms" hint="0 = studio">
            <input className={field} type="number" inputMode="numeric" min={0} value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} />
          </Field>
          <Field label="Beds">
            <input className={field} type="number" inputMode="numeric" min={1} value={beds} onChange={(e) => setBeds(e.target.value)} />
          </Field>
          <Field label="Bathrooms">
            <input className={field} type="number" inputMode="decimal" min={0.5} step={0.5} value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} />
          </Field>
        </div>
      </Section>

      <Section title="Photos" hint="Great photos get more requests. Show the entrance, the main room and the view.">
        <ImageUploader value={photos} onChange={setPhotos} />
      </Section>

      <div id="location">
        <Section title="Exact location" hint="Guests see this pin on the map and can get directions to it, so place it carefully.">
          <LocationPicker
            address={address}
            position={position}
            onAddress={(a, n) => {
              setAddress(a);
              if (n && !neighborhood) setNeighborhood(n);
            }}
            onPosition={setPosition}
          />
        </Section>
      </div>

      <Section title="Amenities">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {AMENITIES.map((a) => (
            <label key={a} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-charcoal-200 px-4 py-3 has-[:checked]:border-charcoal-900 has-[:checked]:bg-charcoal-50">
              <input type="checkbox" checked={amenities.includes(a)} onChange={() => toggleAmenity(a)} className="h-4 w-4 accent-coral-500" />
              <span className="font-medium">{a}</span>
            </label>
          ))}
        </div>
      </Section>

      <Section title="House rules" hint="Check-in times, quiet hours, smoking, pets, parties…">
        <textarea className={`${field} min-h-28`} value={houseRules} onChange={(e) => setHouseRules(e.target.value)} maxLength={2000} aria-label="House rules" />
      </Section>

      <Section title="Booking settings">
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" checked={instantBook} onChange={(e) => setInstantBook(e.target.checked)} className="mt-1 h-4 w-4 accent-coral-500" />
          <span>
            <span className="block font-bold">Instant Book</span>
            <span className="block text-sm text-charcoal-500">Bookings are accepted automatically while units are free. Leave off to review each request yourself.</span>
          </span>
        </label>
      </Section>

      <Section title="Availability" hint="Tap days you can’t host. Days when all your units are booked close automatically.">
        <BlockedDatesEditor value={blockedDates} onChange={setBlockedDates} />
      </Section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-charcoal-100 bg-white/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <Link href="/host/dashboard" className="rounded-full px-4 py-3 text-sm font-semibold text-charcoal-600 hover:text-charcoal-900">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={busy}
            className="rounded-full bg-coral-500 px-7 py-3 font-bold text-white transition hover:bg-coral-600 active:scale-95 disabled:opacity-60"
          >
            {busy ? 'Saving…' : editing ? 'Save changes' : 'Publish listing'}
          </button>
        </div>
      </div>
    </form>
  );
}
