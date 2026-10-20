import type { Metadata } from 'next';
import { Suspense } from 'react';
import ExplorePage from '@/components/explore/ExplorePage';

export const metadata: Metadata = {
  title: 'Explore stays near you',
  description: 'Browse Airbnb stays on a live map around your current location.',
};

export default function Page() {
  // ExplorePage reads the URL (useSearchParams), which requires a Suspense boundary.
  return (
    <Suspense fallback={<div className="flex h-[100dvh] items-center justify-center text-sm text-charcoal-500">Loading…</div>}>
      <ExplorePage />
    </Suspense>
  );
}
