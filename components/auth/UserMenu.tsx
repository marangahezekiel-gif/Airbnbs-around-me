'use client';

/** Header account control: Sign in / List your place for visitors, an avatar menu once signed in. */
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { initials } from '@/lib/format';
import { useRoleSwitch } from './useRoleSwitch';

export function UserMenu({ className = '' }: { className?: string }) {
  const { data: session, status } = useSession();
  const { switchTo, busy } = useRoleSwitch();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Reserve the space while the session loads so the header doesn't jump
  if (status === 'loading') return <span className={`inline-block h-10 w-10 ${className}`} aria-hidden="true" />;

  if (!session?.user) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        <Link href="/signin" className="rounded-full px-3 py-2 text-sm font-semibold text-charcoal-600 hover:text-charcoal-900">
          Sign in
        </Link>
        <Link
          href="/signup?role=host"
          className="hidden rounded-full border border-charcoal-200 px-4 py-2 text-sm font-semibold transition hover:border-charcoal-900 md:inline-flex"
        >
          List your place
        </Link>
      </div>
    );
  }

  const { name, role } = session.user;
  const other = role === 'host' ? 'guest' : 'host';
  const item = 'block w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold hover:bg-charcoal-50';

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-charcoal-900 text-sm font-bold text-white transition hover:bg-charcoal-700"
      >
        {initials(name || 'U')}
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-12 z-50 w-64 rounded-2xl border border-charcoal-100 bg-white p-2 shadow-float">
          <div className="px-3 py-2">
            <p className="truncate font-bold">{name}</p>
            <p className="mt-0.5 inline-flex rounded-full bg-coral-50 px-2 py-0.5 text-xs font-bold capitalize text-coral-700">{role}</p>
          </div>
          <div className="my-1 border-t border-charcoal-100" />
          {role === 'host' && (
            <Link role="menuitem" href="/host/dashboard" onClick={() => setOpen(false)} className={item}>
              Host dashboard
            </Link>
          )}
          <Link role="menuitem" href="/trips" onClick={() => setOpen(false)} className={item}>
            My trips
          </Link>
          <Link role="menuitem" href="/account" onClick={() => setOpen(false)} className={item}>
            Account
          </Link>
          <button
            role="menuitem"
            type="button"
            disabled={busy}
            onClick={() => {
              setOpen(false);
              void switchTo(other);
            }}
            className={`${item} disabled:opacity-50`}
          >
            Switch to {other}
          </button>
          <div className="my-1 border-t border-charcoal-100" />
          <button role="menuitem" type="button" onClick={() => signOut({ callbackUrl: '/' })} className={item}>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
