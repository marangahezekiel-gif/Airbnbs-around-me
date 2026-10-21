'use client';

import { signOut } from 'next-auth/react';
import type { Role } from '@/lib/marketplace/types';
import { useRoleSwitch } from './useRoleSwitch';

interface Props {
  role: Role;
  /** Where to go after switching (a protected page the user was trying to reach) */
  next?: string;
}

export function RoleSwitcher({ role, next }: Props) {
  const { switchTo, busy, error } = useRoleSwitch();
  const other: Role = role === 'host' ? 'guest' : 'host';

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={busy}
        onClick={() => switchTo(other, other === 'host' ? next : undefined)}
        className="w-full rounded-full bg-coral-500 px-5 py-3.5 font-bold text-white transition hover:bg-coral-600 active:scale-[.98] disabled:opacity-60"
      >
        {busy ? 'Switching…' : `Switch to ${other}`}
      </button>
      {error && (
        <p role="alert" className="text-sm font-semibold text-coral-700">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: '/' })}
        className="w-full rounded-full border border-charcoal-200 px-5 py-3 font-semibold transition hover:border-charcoal-900"
      >
        Sign out
      </button>
    </div>
  );
}
