'use client';

/** Sign-in and sign-up form. On sign-up the user picks a role: guest or host. */
import { getSession, signIn } from 'next-auth/react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import type { Role } from '@/lib/marketplace/types';

/** Only follow same-site paths after signing in (blocks open-redirect tricks like //evil.com). */
const safeNext = (v: string | null) => (v && v.startsWith('/') && !v.startsWith('//') ? v : null);

const ROLES: { value: Role; title: string; body: string }[] = [
  { value: 'guest', title: 'I’m a guest', body: 'Find and book stays near me.' },
  { value: 'host', title: 'I’m a host', body: 'List my place and manage bookings.' },
];

const field =
  'w-full rounded-2xl border border-charcoal-200 bg-white px-4 py-3 text-base outline-none transition focus:border-charcoal-900';

export function AuthForm({ mode }: { mode: 'signin' | 'signup' }) {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = safeNext(params.get('callbackUrl'));

  const [role, setRole] = useState<Role>(params.get('role') === 'host' ? 'host' : 'guest');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'signup') {
        const res = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password, role }),
        });
        if (!res.ok) {
          setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? 'Could not create your account.');
          return;
        }
      }

      const result = await signIn('credentials', { redirect: false, email, password });
      if (!result || result.error) {
        setError(result?.error && result.error !== 'CredentialsSignin' ? result.error : 'Wrong email or password.');
        return;
      }

      // Hosts land on their dashboard, guests on the map — unless they were sent here from a page.
      const session = await getSession();
      const dest = callbackUrl ?? (session?.user?.role === 'host' ? '/host/dashboard' : '/explore?locate=1');
      router.push(dest);
      router.refresh();
    } catch {
      setError('Something went wrong. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  const qs = callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : '';

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {mode === 'signup' && (
        <fieldset>
          <legend className="mb-2 text-sm font-bold">How will you use Airbnbs Around Me?</legend>
          <div className="grid grid-cols-2 gap-3">
            {ROLES.map((r) => (
              <label
                key={r.value}
                className={`cursor-pointer rounded-2xl border-2 p-3.5 transition ${
                  role === r.value ? 'border-coral-500 bg-coral-50' : 'border-charcoal-200 hover:border-charcoal-400'
                }`}
              >
                <input type="radio" name="role" value={r.value} checked={role === r.value} onChange={() => setRole(r.value)} className="sr-only" />
                <span className="block font-bold">{r.title}</span>
                <span className="mt-0.5 block text-sm text-charcoal-500">{r.body}</span>
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-charcoal-400">You can switch between host and guest any time.</p>
        </fieldset>
      )}

      {mode === 'signup' && (
        <label className="block">
          <span className="mb-1.5 block text-sm font-bold">Your name</span>
          <input className={field} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
        </label>
      )}

      <label className="block">
        <span className="mb-1.5 block text-sm font-bold">Email</span>
        <input className={field} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" required />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-bold">Password</span>
        <input
          className={field}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          minLength={mode === 'signup' ? 8 : undefined}
          required
        />
        {mode === 'signup' && <span className="mt-1 block text-xs text-charcoal-400">At least 8 characters.</span>}
      </label>

      {error && (
        <p role="alert" className="rounded-2xl bg-coral-50 px-4 py-3 text-sm font-semibold text-coral-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-full bg-coral-500 px-5 py-3.5 text-base font-bold text-white transition hover:bg-coral-600 active:scale-[.98] disabled:opacity-60"
      >
        {busy ? 'Please wait…' : mode === 'signup' ? `Create ${role} account` : 'Sign in'}
      </button>

      <p className="text-center text-sm text-charcoal-500">
        {mode === 'signup' ? (
          <>
            Already have an account?{' '}
            <Link href={`/signin${qs}`} className="font-bold text-charcoal-900 underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{' '}
            <Link href={`/signup${qs}`} className="font-bold text-charcoal-900 underline">
              Create an account
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
