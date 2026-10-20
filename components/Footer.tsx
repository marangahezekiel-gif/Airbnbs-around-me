import Link from 'next/link';
import { Logo } from './Logo';

export function Footer() {
  return (
    <footer className="border-t border-charcoal-100 bg-charcoal-900 text-charcoal-300">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            {/* Wordmark forced light for the dark footer */}
            <span className="inline-flex items-center gap-2">
              <Logo wordmarkClassName="!text-white" />
            </span>
            <p className="mt-4 text-sm leading-relaxed text-charcoal-400">
              Find stays around you in seconds — a live map of places to book, wherever you are.
            </p>
          </div>

          <nav aria-label="Footer" className="flex gap-10 text-sm">
            <ul className="space-y-3">
              <li><Link href="/explore?locate=1" className="hover:text-white">Open the map</Link></li>
              <li><Link href="/#how" className="hover:text-white">How it works</Link></li>
              <li><Link href="/#features" className="hover:text-white">Features</Link></li>
              <li><Link href="/#install" className="hover:text-white">Install the app</Link></li>
            </ul>
          </nav>
        </div>

        <div className="mt-10 space-y-2 border-t border-white/10 pt-6 text-xs leading-relaxed text-charcoal-400">
          <p>Not affiliated with Airbnb, Inc. Listings sourced via public data.</p>
          <p>
            Some links to Airbnb are affiliate links: if you book through them we may earn a commission at no extra cost to
            you. Airbnb is a trademark of Airbnb, Inc.
          </p>
          <p>© {new Date().getFullYear()} Airbnbs Around Me</p>
        </div>
      </div>
    </footer>
  );
}
