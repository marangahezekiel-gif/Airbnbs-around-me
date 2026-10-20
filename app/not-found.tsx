import Link from 'next/link';
import { Header } from '@/components/Header';

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-6 text-center">
        <p className="text-sm font-bold uppercase tracking-widest text-coral-500">404</p>
        <h1 className="mt-3 text-3xl font-extrabold">We couldn’t find that stay.</h1>
        <p className="mt-3 text-charcoal-500">It may have been removed, or the link is out of date.</p>
        <Link href="/explore?locate=1" className="mt-8 rounded-full bg-coral-500 px-6 py-3 font-bold text-white hover:bg-coral-600">
          Back to the map
        </Link>
      </main>
    </>
  );
}
