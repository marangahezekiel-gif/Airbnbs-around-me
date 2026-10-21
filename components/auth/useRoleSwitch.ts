'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import type { Role } from '@/lib/marketplace/types';

/**
 * Switch between host and guest. Saves the role on the server, then asks
 * NextAuth to refresh the session cookie so the new role takes effect now.
 */
export function useRoleSwitch() {
  const { update } = useSession();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const switchTo = useCallback(
    async (role: Role, next?: string) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch('/api/account/role', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role }),
        });
        if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? 'Could not switch');
        await update();
        router.push(next ?? (role === 'host' ? '/host/dashboard' : '/explore?locate=1'));
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not switch role');
      } finally {
        setBusy(false);
      }
    },
    [update, router],
  );

  return { switchTo, busy, error };
}
