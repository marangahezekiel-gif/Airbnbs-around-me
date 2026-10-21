import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthForm } from '@/components/auth/AuthForm';
import { AuthShell } from '@/components/auth/AuthShell';

export const metadata: Metadata = { title: 'Create your account' };

export default function SignUpPage() {
  return (
    <AuthShell title="Create your account" subtitle="Find stays around you — or list your own place and welcome guests.">
      <Suspense fallback={null}>
        <AuthForm mode="signup" />
      </Suspense>
    </AuthShell>
  );
}
