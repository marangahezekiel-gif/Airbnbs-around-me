import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthForm } from '@/components/auth/AuthForm';
import { AuthShell } from '@/components/auth/AuthShell';

export const metadata: Metadata = { title: 'Sign in' };

export default function SignInPage() {
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to request stays or manage your listings.">
      {/* AuthForm reads the URL (useSearchParams), which needs a Suspense boundary */}
      <Suspense fallback={null}>
        <AuthForm mode="signin" />
      </Suspense>
    </AuthShell>
  );
}
