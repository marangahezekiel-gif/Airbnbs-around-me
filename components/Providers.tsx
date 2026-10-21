'use client';

import { SessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';

/** Client-side providers (the signed-in session). Wrapped around the app in app/layout.tsx. */
export function Providers({ children }: { children: ReactNode }) {
  return <SessionProvider refetchOnWindowFocus={false}>{children}</SessionProvider>;
}
