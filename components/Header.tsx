import Link from 'next/link';
import { UserMenu } from './auth/UserMenu';
import { InstallButton } from './InstallPrompt';
import { Logo } from './Logo';

/** Site header for the landing and detail pages. */
export function Header({ transparent = false }: { transparent?: boolean }) {
  return (
    <header
      className={`sticky top-0 z-40 border-b backdrop-blur ${
        transparent ? 'border-transparent bg-sand-100/80' : 'border-charcoal-100 bg-white/90'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="Airbnbs Around Me — home">
          <Logo />
        </Link>

        <nav aria-label="Main" className="flex items-center gap-2 sm:gap-3">
          <Link href="/#how" className="hidden rounded-full px-3 py-2 text-sm font-semibold text-charcoal-600 hover:text-charcoal-900 md:block">
            How it works
          </Link>
          <Link href="/#features" className="hidden rounded-full px-3 py-2 text-sm font-semibold text-charcoal-600 hover:text-charcoal-900 md:block">
            Features
          </Link>
          <InstallButton className="hidden md:inline-flex" />
          <UserMenu />
          <Link
            href="/explore?locate=1"
            className="rounded-full bg-coral-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-coral-600 active:scale-95"
          >
            Open the map
          </Link>
        </nav>
      </div>
    </header>
  );
}
